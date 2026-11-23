import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator

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

    @model_validator(mode="after")
    def normalize_database_urls(self):
        # Automatically ensure asyncpg driver for async SQLAlchemy
        db_url = self.DATABASE_URL.strip()
        if db_url.startswith("postgres://"):
            self.DATABASE_URL = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql://"):
            self.DATABASE_URL = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql+psycopg://"):
            self.DATABASE_URL = db_url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)

        # Derive SYNC_DATABASE_URL if not explicitly customized for remote DB
        sync_url = self.SYNC_DATABASE_URL.strip()
        if ("localhost:5432" in sync_url and "localhost:5432" not in self.DATABASE_URL) or not sync_url:
            self.SYNC_DATABASE_URL = self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
        elif sync_url.startswith("postgres://"):
            self.SYNC_DATABASE_URL = sync_url.replace("postgres://", "postgresql+psycopg://", 1)
        elif sync_url.startswith("postgresql://"):
            self.SYNC_DATABASE_URL = sync_url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif sync_url.startswith("postgresql+asyncpg://"):
            self.SYNC_DATABASE_URL = sync_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
