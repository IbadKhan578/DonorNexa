import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_public_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Public statistics
        stats_resp = await ac.get("/api/v1/public/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert "registered_donors" in stats
        assert "active_requests" in stats

        # Public cities
        cities_resp = await ac.get("/api/v1/public/cities")
        assert cities_resp.status_code == 200
        cities = cities_resp.json()
        assert len(cities) >= 5
        city_names = [c["name"] for c in cities]
        assert "Karachi" in city_names
        assert "Lahore" in city_names
        assert "Islamabad" in city_names

        # Public emergencies
        emergencies_resp = await ac.get("/api/v1/public/emergencies")
        assert emergencies_resp.status_code == 200
        assert isinstance(emergencies_resp.json(), list)

@pytest.mark.asyncio
async def test_auth_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login with demo admin
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": "admin@donornexa.pk",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

        # 2. Login with invalid password
        bad_resp = await ac.post("/api/v1/auth/login", json={
            "email": "admin@donornexa.pk",
            "password": "WrongPassword!"
        })
        assert bad_resp.status_code == 401

@pytest.mark.asyncio
async def test_donor_authorized_flow():
    # Login as donor
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": "ayesha@donor.pk",
            "password": "Donor@123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        profile_resp = await ac.get("/api/v1/donor/profile", headers=headers)
        assert profile_resp.status_code == 200
        profile = profile_resp.json()
        assert profile["blood_group"] == "O-"
        assert "cnic" in profile
        assert profile["weight"] >= 50.0

@pytest.mark.asyncio
async def test_hospital_inventory_and_requests():
    # Login as verified hospital
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": "civil@hospital.pk",
            "password": "Hospital@123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check inventory
        inv_resp = await ac.get("/api/v1/hospital/inventory", headers=headers)
        assert inv_resp.status_code == 200
        inventory = inv_resp.json()
        assert len(inventory) == 8  # 8 blood groups
