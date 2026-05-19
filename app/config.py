from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Required — app will fail at startup if these are missing from .env
    DATABASE_URL: str

    # Storage — defaults to local filesystem (safe for PoC)
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./data"

    # S3 / R2 — only needed when STORAGE_BACKEND=s3
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "auto"

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_DURATION_SEC: int = 600
    MIN_DURATION_SEC: int = 10

    # Stems
    KEEP_STEMS: bool = True
    STEMS_TTL_DAYS: int = 7

    # Analysis pipeline temp directory
    WORK_DIR: str = "/tmp/music-analyzer"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
