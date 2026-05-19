from abc import ABC, abstractmethod
from pathlib import Path
from functools import lru_cache
import boto3
from app.config import settings


class StorageBackend(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str:
        """Persist data under key. Returns the key."""

    @abstractmethod
    def load(self, key: str) -> bytes:
        """Load data by key."""

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Return a URL to access the stored file."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str = "./data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, key: str, data: bytes) -> str:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def load(self, key: str) -> bytes:
        return (self.base_dir / key).read_bytes()

    def get_url(self, key: str) -> str:
        return f"file://{(self.base_dir / key).resolve()}"


class S3StorageBackend(StorageBackend):
    def __init__(self, bucket: str, endpoint_url: str, region: str):
        self.bucket = bucket
        self.client = boto3.client("s3", endpoint_url=endpoint_url, region_name=region)

    def save(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def load(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def get_url(self, key: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=3600,
        )


@lru_cache
def _make_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3StorageBackend(
            bucket=settings.S3_BUCKET,
            endpoint_url=settings.S3_ENDPOINT_URL,
            region=settings.S3_REGION,
        )
    return LocalStorageBackend(settings.STORAGE_LOCAL_DIR)
