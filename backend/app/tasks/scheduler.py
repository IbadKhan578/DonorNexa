import asyncio
import logging
from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.models.blood_request import BloodRequest
from app.models.match import RequestMatch
from app.core.constants import (
    REQUEST_STATUS_OPEN, REQUEST_STATUS_EXPIRED,
    MATCH_STATUS_NOTIFIED, MATCH_STATUS_NO_RESPONSE
)
from app.core.timezone import now_utc
from app.services.audit_service import log_audit_event

logger = logging.getLogger("donornexa.tasks")

async def run_expiry_job():
    """
    Background job running every 60 seconds:
    1. Finds open blood requests where required_by <= now_utc() and marks them 'expired'.
    2. Finds unanswered matches (status 'notified') belonging to expired requests and marks them 'no_response'.
    """
    try:
        async with AsyncSessionLocal() as session:
            current_time = now_utc()

            # 1. Find open requests past their required_by deadline
            req_stmt = (
                select(BloodRequest)
                .where(
                    BloodRequest.status == REQUEST_STATUS_OPEN,
                    BloodRequest.required_by <= current_time
                )
            )
            res = await session.execute(req_stmt)
            expired_requests = res.scalars().all()

            for req in expired_requests:
                req.status = REQUEST_STATUS_EXPIRED
                await log_audit_event(
                    session=session,
                    user_id=None,
                    action="Expired",
                    entity=f"blood_request #{req.id}",
                    old_value="open",
                    new_value="expired",
                    ip_address="system"
                )
                logger.info(f"Auto-expired blood request #{req.id}")

            # 2. Timeout unanswered matches for expired requests
            if expired_requests:
                expired_req_ids = [r.id for r in expired_requests]
                matches_stmt = (
                    select(RequestMatch)
                    .where(
                        RequestMatch.request_id.in_(expired_req_ids),
                        RequestMatch.status == MATCH_STATUS_NOTIFIED
                    )
                )
                matches_res = await session.execute(matches_stmt)
                timeout_matches = matches_res.scalars().all()

                for m in timeout_matches:
                    m.status = MATCH_STATUS_NO_RESPONSE
                    m.responded_at = current_time
                    await log_audit_event(
                        session=session,
                        user_id=m.donor_id,
                        action="Timeout",
                        entity=f"request_match #{m.id}",
                        old_value="notified",
                        new_value="no_response",
                        ip_address="system"
                    )
                    logger.info(f"Timeout match #{m.id} to no_response")

            await session.commit()
    except Exception as e:
        logger.error(f"Error running auto-expiry task: {e}", exc_info=True)

class BackgroundScheduler:
    def __init__(self, interval_seconds: int = 60):
        self.interval = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info(f"DonorNexa background expiry worker started (interval: {self.interval}s)")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("DonorNexa background expiry worker stopped")

    async def _loop(self):
        while self._running:
            await run_expiry_job()
            try:
                await asyncio.sleep(self.interval)
            except asyncio.CancelledError:
                break

scheduler = BackgroundScheduler(interval_seconds=60)
