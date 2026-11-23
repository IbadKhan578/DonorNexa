from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.inventory import BloodInventory
from app.core.constants import BLOOD_GROUPS
from app.core.timezone import now_utc
from app.services.audit_service import log_audit_event

async def ensure_hospital_inventory(session: AsyncSession, hospital_id: int) -> List[BloodInventory]:
    """Ensure all 8 blood groups exist in inventory for the hospital."""
    stmt = select(BloodInventory).where(BloodInventory.hospital_id == hospital_id)
    res = await session.execute(stmt)
    existing = {inv.blood_group: inv for inv in res.scalars().all()}

    new_items = []
    for bg in BLOOD_GROUPS:
        if bg not in existing:
            item = BloodInventory(
                hospital_id=hospital_id,
                blood_group=bg,
                units_available=0,
                updated_at=now_utc()
            )
            session.add(item)
            new_items.append(item)

    if new_items:
        await session.commit()

    # Re-query all items in standard order
    res = await session.execute(
        select(BloodInventory)
        .where(BloodInventory.hospital_id == hospital_id)
    )
    items_by_bg = {inv.blood_group: inv for inv in res.scalars().all()}
    return [items_by_bg[bg] for bg in BLOOD_GROUPS if bg in items_by_bg]

async def update_inventory_units(
    session: AsyncSession,
    hospital_id: int,
    blood_group: str,
    units_available: int,
    user_id: int,
    ip_address: Optional[str] = None
) -> BloodInventory:
    """Safely update inventory count for a specific blood group."""
    blood_group = blood_group.strip().upper()
    if blood_group not in BLOOD_GROUPS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid blood group")

    if units_available < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Units available cannot be negative")

    stmt = (
        select(BloodInventory)
        .where(
            BloodInventory.hospital_id == hospital_id,
            BloodInventory.blood_group == blood_group
        )
        .with_for_update()
    )
    res = await session.execute(stmt)
    inv = res.scalar_one_or_none()

    old_val = "0"
    if not inv:
        inv = BloodInventory(
            hospital_id=hospital_id,
            blood_group=blood_group,
            units_available=units_available,
            updated_at=now_utc()
        )
        session.add(inv)
    else:
        old_val = str(inv.units_available)
        inv.units_available = units_available
        inv.updated_at = now_utc()

    await log_audit_event(
        session=session,
        user_id=user_id,
        action="Inventory updated",
        entity=f"inventory {blood_group} hospital #{hospital_id}",
        old_value=f"{old_val} units",
        new_value=f"{units_available} units",
        ip_address=ip_address
    )

    await session.commit()
    await session.refresh(inv)
    return inv

async def increment_inventory_on_donation(
    session: AsyncSession,
    hospital_id: int,
    blood_group: str,
    units: int = 1
) -> BloodInventory:
    """Increase hospital blood group inventory when donation completes."""
    stmt = (
        select(BloodInventory)
        .where(
            BloodInventory.hospital_id == hospital_id,
            BloodInventory.blood_group == blood_group
        )
        .with_for_update()
    )
    res = await session.execute(stmt)
    inv = res.scalar_one_or_none()

    if not inv:
        inv = BloodInventory(
            hospital_id=hospital_id,
            blood_group=blood_group,
            units_available=units,
            updated_at=now_utc()
        )
        session.add(inv)
    else:
        inv.units_available += units
        inv.updated_at = now_utc()

    return inv
