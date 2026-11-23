import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "DonorNexa"
    PROJECT_TAGLINE: str = "Connecting Donors. Bridging Lives. Saving Hope."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:12345678@localhost:5432/donornexa"
    SYNC_DATABASE_URL: str = "postgresql+psycopg://postgres:12345678@localhost:5432/donornexa"

    SECRET_KEY: str = "donornexa-super-secret-jwt-key-2026-pakistan-secure-random-token-xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    UPLOAD_DIR: str = "uploads"
    MAX_PROFILE_PHOTO_SIZE: int = 2 * 1024 * 1024  # 2 MB
    MAX_LICENCE_FILE_SIZE: int = 5 * 1024 * 1024   # 5 MB

    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    TIMEZONE: str = "Asia/Karachi"
    ENVIRONMENT: str = "development"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
