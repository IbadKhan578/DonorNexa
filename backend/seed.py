import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy import select, text
from app.db.session import async_engine, AsyncSessionLocal
from app.db.base import Base
import app.models  # load all models
from app.models.city import City
from app.models.user import User
from app.models.donor import Donor
from app.models.hospital import Hospital
from app.models.compatibility import BloodCompatibility
from app.models.blood_request import BloodRequest
from app.models.match import RequestMatch
from app.models.donation import Donation
from app.models.inventory import BloodInventory
from app.models.settings import SystemSetting
from app.models.audit import AuditLog
from app.core.security import get_password_hash
from app.core.constants import (
    BLOOD_GROUPS, BLOOD_COMPATIBILITY_MAP,
    ROLE_ADMIN, ROLE_HOSPITAL, ROLE_DONOR,
    USER_STATUS_ACTIVE, HOSPITAL_STATUS_VERIFIED, HOSPITAL_STATUS_PENDING,
    URGENCY_CRITICAL, URGENCY_URGENT, URGENCY_NORMAL,
    REQUEST_STATUS_OPEN, REQUEST_STATUS_FULFILLED, REQUEST_STATUS_EXPIRED,
    MATCH_STATUS_NOTIFIED, MATCH_STATUS_ACCEPTED, MATCH_STATUS_DECLINED, MATCH_STATUS_COMPLETED
)
from app.core.timezone import now_utc, today_pkt, to_utc

async def seed_all():
    print("Beginning database schema setup and seeding...")
    async with async_engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

        # Create PostgreSQL View: v_eligible_donors
        await conn.execute(text("""
            CREATE OR REPLACE VIEW v_eligible_donors AS
            SELECT 
                d.user_id,
                u.name,
                u.email,
                d.blood_group,
                d.dob,
                d.weight,
                d.city_id,
                c.city_name,
                c.province,
                d.phone,
                d.last_donation_date,
                d.is_available,
                u.status AS user_status,
                (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM d.dob) - 
                    CASE WHEN (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE)) < 
                              (EXTRACT(MONTH FROM d.dob), EXTRACT(DAY FROM d.dob)) 
                         THEN 1 ELSE 0 END) AS age
            FROM donors d
            JOIN users u ON d.user_id = u.id
            JOIN cities c ON d.city_id = c.id
            WHERE u.status = 'active'
              AND d.is_available = TRUE
              AND d.weight >= 50.0
              AND (d.last_donation_date IS NULL OR (CURRENT_DATE - d.last_donation_date) >= 90);
        """))

        # Create Trigger Function
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION fn_after_donation_insert()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE donors
                SET last_donation_date = CURRENT_DATE
                WHERE user_id = (SELECT donor_id FROM request_matches WHERE id = NEW.match_id);

                UPDATE request_matches
                SET status = 'completed'
                WHERE id = NEW.match_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))

        # Drop existing trigger
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_after_donation_insert ON donations;"))

        # Create Trigger
        await conn.execute(text("""
            CREATE TRIGGER trg_after_donation_insert
            AFTER INSERT ON donations
            FOR EACH ROW
            EXECUTE FUNCTION fn_after_donation_insert();
        """))

    async with AsyncSessionLocal() as session:
        # 1. Seed Cities
        cities_data = [
            ("Karachi", "Sindh"),
            ("Lahore", "Punjab"),
            ("Islamabad", "ICT"),
            ("Rawalpindi", "Punjab"),
            ("Peshawar", "KPK"),
            ("Quetta", "Balochistan"),
            ("Multan", "Punjab"),
            ("Faisalabad", "Punjab"),
            ("Hyderabad", "Sindh"),
            ("Gujranwala", "Punjab")
        ]
        city_objs = {}
        for cname, prov in cities_data:
            stmt = select(City).where(City.city_name == cname, City.province == prov)
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                c = City(city_name=cname, province=prov)
                session.add(c)
                await session.flush()
                city_objs[cname] = c
            else:
                city_objs[cname] = existing

        # 2. Seed Blood Compatibility Matrix
        for rec, donors in BLOOD_COMPATIBILITY_MAP.items():
            for don in donors:
                stmt = select(BloodCompatibility).where(
                    BloodCompatibility.recipient_group == rec,
                    BloodCompatibility.donor_group == don
                )
                if not (await session.execute(stmt)).scalar_one_or_none():
                    session.add(BloodCompatibility(
                        recipient_group=rec,
                        donor_group=don,
                        is_exact_match=(rec == don)
                    ))

        # 3. Seed System Settings
        settings_defaults = {
            "cooldown_days": "90",
            "top_n_donors": "5",
            "max_open_critical": "3",
            "widen_critical_pool": "true",
            "exact_match_bonus": "40.0",
            "same_city_bonus": "25.0"
        }
        for k, v in settings_defaults.items():
            stmt = select(SystemSetting).where(SystemSetting.key == k)
            if not (await session.execute(stmt)).scalar_one_or_none():
                session.add(SystemSetting(key=k, value=v, updated_at=now_utc()))

        # 4. Seed Admin
        admin_stmt = select(User).where(User.email == "admin@donornexa.pk")
        admin = (await session.execute(admin_stmt)).scalar_one_or_none()
        if not admin:
            admin = User(
                name="Platform admin",
                email="admin@donornexa.pk",
                cnic="42101-0000000-1",
                password_hash=get_password_hash("Admin@123"),
                role=ROLE_ADMIN,
                status=USER_STATUS_ACTIVE,
                created_at=now_utc()
            )
            session.add(admin)
            await session.flush()

        # 5. Seed Hospitals
        hospitals_data = [
            ("Civil Hospital Karachi", "civil@hospital.pk", "42101-1111111-1", "SHC-KHI-10492", "Karachi", HOSPITAL_STATUS_VERIFIED, 92),
            ("Aga Khan University Hospital", "akuh@hospital.pk", "42101-2222222-1", "SHC-KHI-04412", "Karachi", HOSPITAL_STATUS_VERIFIED, 98),
            ("Indus Hospital", "indus@hospital.pk", "42101-3333333-1", "SHC-KHI-02210", "Karachi", HOSPITAL_STATUS_PENDING, 88),
            ("Shifa International", "shifa@hospital.pk", "61101-4444444-1", "ICT-HC-8841", "Islamabad", HOSPITAL_STATUS_PENDING, 90),
            ("Mayo Hospital", "mayo@hospital.pk", "35202-5555555-1", "PHC-LHR-0332", "Lahore", HOSPITAL_STATUS_PENDING, 85)
        ]

        hosp_objs = {}
        for hname, hemail, hcnic, lic, hcity, hstatus, trust in hospitals_data:
            stmt = select(User).where(User.email == hemail)
            user = (await session.execute(stmt)).scalar_one_or_none()
            if not user:
                user = User(
                    name=hname,
                    email=hemail,
                    cnic=hcnic,
                    password_hash=get_password_hash("Hospital@123"),
                    role=ROLE_HOSPITAL,
                    status=USER_STATUS_ACTIVE,
                    created_at=now_utc()
                )
                session.add(user)
                await session.flush()

                hosp = Hospital(
                    user_id=user.id,
                    hospital_name=hname,
                    licence_no=lic,
                    licence_file_path="/uploads/licences/sample_licence.pdf",
                    city_id=city_objs[hcity].id,
                    verification_status=hstatus,
                    trust_score=trust
                )
                session.add(hosp)
                await session.flush()
                hosp_objs[hname] = hosp
            else:
                h_stmt = select(Hospital).where(Hospital.user_id == user.id)
                hosp_objs[hname] = (await session.execute(h_stmt)).scalar_one()

        # 6. Seed Donors (Matching Design Reference screens!)
        donors_data = [
            ("Ayesha Khan", "ayesha@donor.pk", "42101-9876543-1", "0312-3456789", "O-", date(2001, 4, 15), 62.0, "Karachi", today_pkt() - timedelta(days=100), True),
            ("Bilal Ahmed", "bilal@donor.pk", "42101-8765432-1", "0321-7654314", "O-", date(1998, 8, 20), 72.0, "Karachi", today_pkt() - timedelta(days=142), True),
            ("Sana Malik", "sana@donor.pk", "42101-7654321-1", "0333-6543207", "O-", date(1999, 11, 5), 55.0, "Karachi", today_pkt() - timedelta(days=96), True),
            ("Hamza Raza", "hamza@donor.pk", "41301-6543210-1", "0300-5432162", "O-", date(1995, 2, 10), 76.0, "Hyderabad", today_pkt() - timedelta(days=210), True),
            ("Zainab Shah", "zainab@donor.pk", "42101-5432109-1", "0345-4321038", "O-", date(2000, 7, 18), 58.0, "Karachi", today_pkt() - timedelta(days=55), True), # In cooldown
            ("Tariq Mahmood", "tariq@donor.pk", "35202-4321098-1", "0311-3210945", "B+", date(1996, 5, 22), 68.0, "Lahore", today_pkt() - timedelta(days=120), True),
            ("Usman Ali", "usman@donor.pk", "61101-3210987-1", "0302-2109876", "A-", date(1997, 9, 30), 65.0, "Islamabad", today_pkt() - timedelta(days=110), True),
            ("Fatima Noor", "fatima@donor.pk", "42101-2109876-1", "0334-1098765", "AB+", date(2002, 1, 14), 54.0, "Karachi", None, True),
            ("Ali Hassan", "ali@donor.pk", "42101-1098765-1", "0322-0987654", "O+", date(1994, 3, 25), 80.0, "Karachi", today_pkt() - timedelta(days=95), True)
        ]

        donor_objs = {}
        for dname, demail, dcnic, dphone, bg, dob, weight, dcity, last_don, is_avail in donors_data:
            stmt = select(User).where(User.email == demail)
            user = (await session.execute(stmt)).scalar_one_or_none()
            if not user:
                user = User(
                    name=dname,
                    email=demail,
                    cnic=dcnic,
                    password_hash=get_password_hash("Donor@123"),
                    role=ROLE_DONOR,
                    status=USER_STATUS_ACTIVE,
                    created_at=now_utc()
                )
                session.add(user)
                await session.flush()

                d = Donor(
                    user_id=user.id,
                    blood_group=bg,
                    dob=dob,
                    weight=weight,
                    city_id=city_objs[dcity].id,
                    phone=dphone,
                    last_donation_date=last_don,
                    is_available=is_avail,
                    photo_path=None
                )
                session.add(d)
                await session.flush()
                donor_objs[dname] = d
            else:
                d_stmt = select(Donor).where(Donor.user_id == user.id)
                donor_objs[dname] = (await session.execute(d_stmt)).scalar_one()

        # 7. Seed Inventory for Civil Hospital Karachi (matching design screen 09)
        ch_hosp = hosp_objs["Civil Hospital Karachi"]
        ch_inventory = {
            "O-": 4, "O+": 18, "A-": 6, "A+": 14,
            "B-": 3, "B+": 11, "AB-": 2, "AB+": 7
        }
        for bg, units in ch_inventory.items():
            inv_stmt = select(BloodInventory).where(
                BloodInventory.hospital_id == ch_hosp.user_id,
                BloodInventory.blood_group == bg
            )
            inv = (await session.execute(inv_stmt)).scalar_one_or_none()
            if not inv:
                session.add(BloodInventory(
                    hospital_id=ch_hosp.user_id,
                    blood_group=bg,
                    units_available=units,
                    updated_at=now_utc()
                ))

        # 8. Seed Blood Requests matching screen 09 & 11
        # #RQ-2041: O-, 3 units, Critical, today 18:30 PKT
        current_time = now_utc()
        rq_check = select(BloodRequest).where(BloodRequest.notes == "Ward 4, Blood bank counter")
        existing_rq = (await session.execute(rq_check)).scalar_one_or_none()
        if not existing_rq:
            rq_2041 = BloodRequest(
                hospital_id=ch_hosp.user_id,
                blood_group="O-",
                units_needed=3,
                units_fulfilled=1,
                urgency=URGENCY_CRITICAL,
                required_by=current_time + timedelta(hours=3, minutes=14),
                notes="Ward 4, Blood bank counter",
                status=REQUEST_STATUS_OPEN,
                created_at=current_time - timedelta(minutes=40)
            )
            session.add(rq_2041)
            await session.flush()

            # Matches for #RQ-2041 matching screen 11:
            # 1. Ayesha Khan: score 94, Accepted (revealed phone 0312-3456789)
            # 2. Bilal Ahmed: score 89, Notified (masked phone 03••-•••••14)
            # 3. Sana Malik: score 86, Notified (masked phone 03••-•••••07)
            # 4. Hamza Raza: score 72, Notified (masked phone 03••-•••••62)
            # 5. Zainab Shah: score 64, Declined (declined: "Travelling")
            ayesha_m = RequestMatch(
                request_id=rq_2041.id,
                donor_id=donor_objs["Ayesha Khan"].user_id,
                score=94.0,
                status=MATCH_STATUS_ACCEPTED,
                responded_at=current_time - timedelta(minutes=20)
            )
            session.add(ayesha_m)

            bilal_m = RequestMatch(
                request_id=rq_2041.id,
                donor_id=donor_objs["Bilal Ahmed"].user_id,
                score=89.0,
                status=MATCH_STATUS_NOTIFIED
            )
            session.add(bilal_m)

            sana_m = RequestMatch(
                request_id=rq_2041.id,
                donor_id=donor_objs["Sana Malik"].user_id,
                score=86.0,
                status=MATCH_STATUS_NOTIFIED
            )
            session.add(sana_m)

            hamza_m = RequestMatch(
                request_id=rq_2041.id,
                donor_id=donor_objs["Hamza Raza"].user_id,
                score=72.0,
                status=MATCH_STATUS_NOTIFIED
            )
            session.add(hamza_m)

            zainab_m = RequestMatch(
                request_id=rq_2041.id,
                donor_id=donor_objs["Zainab Shah"].user_id,
                score=64.0,
                status=MATCH_STATUS_DECLINED,
                decline_reason="Travelling",
                responded_at=current_time - timedelta(minutes=30)
            )
            session.add(zainab_m)

            # Additional requests from screen 09
            rq_2038 = BloodRequest(
                hospital_id=ch_hosp.user_id,
                blood_group="B+",
                units_needed=2,
                units_fulfilled=2,
                urgency=URGENCY_URGENT,
                required_by=current_time + timedelta(hours=14),
                notes="Surgery Unit 2",
                status=REQUEST_STATUS_FULFILLED,
                created_at=current_time - timedelta(hours=6)
            )
            session.add(rq_2038)

            rq_2036 = BloodRequest(
                hospital_id=ch_hosp.user_id,
                blood_group="A-",
                units_needed=1,
                units_fulfilled=0,
                urgency=URGENCY_URGENT,
                required_by=current_time + timedelta(hours=16),
                notes="Emergency OT",
                status=REQUEST_STATUS_OPEN,
                created_at=current_time - timedelta(hours=2)
            )
            session.add(rq_2036)

            rq_2031 = BloodRequest(
                hospital_id=ch_hosp.user_id,
                blood_group="AB+",
                units_needed=1,
                units_fulfilled=1,
                urgency=URGENCY_NORMAL,
                required_by=current_time + timedelta(days=2),
                notes="General Ward",
                status=REQUEST_STATUS_FULFILLED,
                created_at=current_time - timedelta(days=1)
            )
            session.add(rq_2031)

            rq_2027 = BloodRequest(
                hospital_id=ch_hosp.user_id,
                blood_group="O+",
                units_needed=2,
                units_fulfilled=0,
                urgency=URGENCY_NORMAL,
                required_by=current_time - timedelta(hours=12),
                notes="Thalassemia Daycare",
                status=REQUEST_STATUS_EXPIRED,
                created_at=current_time - timedelta(days=2)
            )
            session.add(rq_2027)

        # 9. Seed Ayesha Khan's past donation history (matching screen 08)
        ayesha_user = donor_objs["Ayesha Khan"]
        donations_history = [
            ("Civil Hospital Karachi", date(2026, 8, 14), 1),
            ("Aga Khan University Hospital", date(2026, 5, 2), 1),
            ("Indus Hospital", date(2026, 1, 19), 2),
            ("Civil Hospital Karachi", date(2025, 10, 8), 1),
        ]
        for h_name, d_date, u_count in donations_history:
            # Check if exists
            h_obj = hosp_objs.get(h_name)
            if h_obj:
                # Create a fulfilled dummy request + match to link properly
                past_req = BloodRequest(
                    hospital_id=h_obj.user_id,
                    blood_group="O-",
                    units_needed=u_count,
                    units_fulfilled=u_count,
                    urgency=URGENCY_NORMAL,
                    required_by=to_utc(datetime(d_date.year, d_date.month, d_date.day, 18, 0)),
                    notes="Completed donation",
                    status=REQUEST_STATUS_FULFILLED,
                    created_at=to_utc(datetime(d_date.year, d_date.month, d_date.day, 10, 0))
                )
                session.add(past_req)
                await session.flush()

                past_match = RequestMatch(
                    request_id=past_req.id,
                    donor_id=ayesha_user.user_id,
                    score=95.0,
                    status=MATCH_STATUS_COMPLETED,
                    responded_at=to_utc(datetime(d_date.year, d_date.month, d_date.day, 11, 0))
                )
                session.add(past_match)
                await session.flush()

                past_don = Donation(
                    match_id=past_match.id,
                    units=u_count,
                    donated_on=to_utc(datetime(d_date.year, d_date.month, d_date.day, 14, 0)),
                    verified_by=h_obj.user_id
                )
                session.add(past_don)

        # 10. Seed Audit Logs (Matching screen 14)
        audit_seed = [
            (donor_objs["Ayesha Khan"].user_id, "Accepted", "request_match #8841", "notified", "accepted", "39.45.12.7"),
            (None, "Contact reveal", f"donor #{donor_objs['Ayesha Khan'].user_id} → hospital #{ch_hosp.user_id}", "—", "revealed", None),
            (ch_hosp.user_id, "Created", "blood_request #2041", "—", "open", "182.186.4.91"),
            (admin.id, "Verified", f"hospital #{ch_hosp.user_id}", "pending", "verified", "103.31.8.2"),
            (None, "Expired", "blood_request #2027", "open", "expired", None),
            (admin.id, "Blocked", "user #301", "active", "blocked", "103.31.8.2"),
        ]
        for uid, act, ent, old_v, new_v, ip in audit_seed:
            session.add(AuditLog(
                user_id=uid,
                action=act,
                entity=ent,
                old_value=old_v,
                new_value=new_v,
                ip_address=ip,
                created_at=now_utc()
            ))

        await session.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(seed_all())
