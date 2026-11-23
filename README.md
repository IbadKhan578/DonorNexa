# DonorNexa — Emergency Blood Donor Coordination Portal for Pakistan

> **"Connecting Donors. Bridging Lives. Saving Hope."**

DonorNexa is a production-grade, full-stack emergency blood donor coordination and hospital blood bank inventory management system tailored for Pakistan. It solves fragmented WhatsApp/call coordination, prevents donor fatigue through fair rotation and recovery tracking, guarantees donor phone privacy via dynamic unmasking, and protects hospital requests against race conditions using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).

---

## 1. System Architecture & Tech Stack

### Frontend
- **Framework:** React 18 (JavaScript ES6+, Vite)
- **Styling:** Tailwind CSS (Custom design tokens matching editorial healthcare visual reference)
- **Typography:** Fraunces (Headings/Display), IBM Plex Sans (Interface/Body), IBM Plex Mono (IDs/Timestamps)
- **Routing:** React Router v6 with role-based `ProtectedRoute` guards
- **API Client:** Axios with bearer token management and HttpOnly refresh token rotation
- **Design:** Editorial warm healthcare palette (`#F6F3EE`, `#FFFFFF`, `#B3202A`, `#1F5F5B`, `#A85A0A`, etc.)

### Backend
- **Framework:** FastAPI (Python 3.12, async endpoints, lifespan management)
- **Validation:** Pydantic v2
- **ORM & DB Access:** SQLAlchemy 2.0 (async sessions via `asyncpg`, sync migration support via `psycopg[binary]`)
- **Database:** PostgreSQL 18 (Local Windows Service `postgresql-x64-18` on port 5432)
- **Background Tasks:** APScheduler (60-second loop auto-expiring overdue requests and timing out unanswered matches)
- **Security:** Passlib + Bcrypt password hashing, PyJWT (HMAC-SHA256) access tokens, HttpOnly refresh cookies, Nosniff/CSP headers
- **File Validation:** Magic-byte inspection for profile photos (JPEG/PNG <= 2MB) and hospital licences (PDF/JPEG/PNG <= 5MB)

---

## 2. Pakistan Localization

- **Timezone:** Asia/Karachi (PKT, UTC+5). Timestamps stored in UTC in PostgreSQL and converted to PKT for user display and deadline tracking.
- **CNIC Validation:** Strict regex enforcement: `^\d{5}-\d{7}-\d{1}$` (e.g., `42101-1234567-1`).
- **Mobile Validation:** Strict Pakistan mobile operator format: `^03\d{2}-\d{7}$` (e.g., `0300-1234567`).
- **Privacy Masking:** Phone numbers masked as `03••-•••••14` until an alerted donor explicitly accepts an emergency match.
- **Geographic Modeling:** Normalized `cities` table storing major Pakistani cities and provinces (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, Quetta, Multan, Hyderabad) used for proximity matching.

---

## 3. Database Schema, View & Trigger

- **Database Name:** `donornexa`
- **Tables (12):** `users`, `donors`, `hospitals`, `cities`, `blood_compatibility`, `blood_requests`, `request_matches`, `donations`, `blood_inventory`, `system_settings`, `notifications`, `audit_logs`.
- **Database View (`v_eligible_donors`):**
  Calculates active, available donors who weigh >= 50 kg, whose age in Pakistan Standard Time is between 18 and 60, and whose last donation was at least 90 days ago.
- **Database Trigger (`trg_after_donation_insert`):**
  Executed on row insert into `donations`. Automatically resets donor's `last_donation_date = CURRENT_DATE` and marks the match as `completed`.
- **Concurrency Protection:**
  `SELECT ... FOR UPDATE` row-level locks on `blood_requests` inside atomic transactions. Prevents over-accepting donors when multiple alerted candidates respond simultaneously.

---

## 4. Pre-Seeded Demo Accounts

You can log in directly using the quick demo buttons on the `/login` page or entering these credentials:

| Role | Email | Password | Details |
|---|---|---|---|
| **Super Admin** | `admin@donornexa.pk` | `Admin@123` | System settings, analytics, audit CSV, hospital verification |
| **Verified Hospital** | `civil@hospital.pk` | `Hospital@123` | Civil Hospital Karachi (Verified, manages requests & inventory) |
| **Pending Hospital** | `indus@hospital.pk` | `Hospital@123` | Indus Hospital (Under administrative licence review) |
| **Volunteer Donor** | `ayesha@donor.pk` | `Donor@123` | Ayesha Khan (Blood Group O-, Karachi, Eligible) |

---

## 5. Quick Start Instructions (Windows)

### Prerequisites
1. PostgreSQL 18 running locally on `localhost:5432` with user `postgres` and password `12345678`.
2. Python 3.12+ installed.
3. Node.js 18+ and npm installed.

### Option A: One-Click Startup Scripts
1. Double-click `run_backend.bat` to activate virtualenv and start FastAPI on `http://localhost:8000`.
2. Double-click `run_frontend.bat` to launch Vite frontend on `http://localhost:5173`.
3. Open your browser to `http://localhost:5173`.

### Option B: Manual Command Line

#### 1. Backend Setup & Run
```powershell
cd backend
# Virtual environment is already created at backend\venv
.\venv\Scripts\activate
# If re-seeding is ever needed:
python seed.py
# Run FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation is available at `http://localhost:8000/docs`.

#### 2. Frontend Setup & Run
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173`.

---

## 6. Automated Test Suite

A complete test suite is provided covering CNIC/Mobile regex, phone masking, ABO/Rh compatibility, age calculation in PKT, Top-N matching algorithm, and authenticated API endpoints.

To run all automated tests:
```powershell
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe -v
```
All 10 test suites pass with 100% green output.

---

## 7. Key Application Features

1. **Public Emergency Board (`/emergencies`):** Real-time board with blood group filters, urgency chips, and countdown timers. Discloses no private patient data.
2. **Donor Portal (`/donor/dashboard`, `/donor/matches`):** 90-day cooldown status tracker, quick availability toggle, active match alerts, and confirmation dialogs revealing hospital address and contact upon commitment.
3. **Hospital Portal (`/hospital/dashboard`, `/hospital/requests/new`, `/hospital/requests/:id`):** Emergency request creation (enforcing <= 3 critical limit), Top-N ranked donor matching, contact unmasking upon donor accept, completed donation verification, and inventory auto-credit.
4. **Blood Bank Inventory (`/hospital/inventory`):** Live tracking of all 8 blood groups with stock alerts (Adequate, Low, Depleted) and manual adjustment audit logging.
5. **Admin Operations (`/admin/dashboard`, `/admin/verification`, `/admin/audit`, `/admin/settings`):** National demand vs supply analytics, PDF licence verification, immutable audit logs with streaming CSV export, and live tuning of safety cooldown days and Top-N match sizes.
