import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.routers import auth, public, donor, hospital, admin
from app.tasks.scheduler import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background auto-expiry scheduler
    await scheduler.start()
    yield
    # Shutdown: Stop scheduler cleanly
    await scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Emergency Blood Donor Coordination and Hospital Inventory Management Portal for Pakistan",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Configuration
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Ensure upload directories exist
uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(os.path.join(uploads_dir, "profiles"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "licences"), exist_ok=True)

# Mount static files for secure uploads (photos and licences)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Versioned Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)
app.include_router(donor.router, prefix=settings.API_V1_STR)
app.include_router(hospital.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timezone": settings.TIMEZONE
    }
