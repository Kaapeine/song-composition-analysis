import uuid
import subprocess
import json
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.storage import StorageBackend
from app.dependencies import get_storage, get_current_user
from app.models.db import File as FileModel
from app.models.schemas import FileResponse
from app.config import settings

router = APIRouter()

ACCEPTED_MIME_TYPES = {
    "audio/mpeg", "audio/wav", "audio/flac",
    "audio/aiff", "audio/x-aiff", "audio/x-wav",
}


def _ffprobe_duration(data: bytes, suffix: str) -> float:
    """Write data to a temp file, run ffprobe, return duration in seconds."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(data)
        tmp = f.name
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", tmp,
            ],
            stderr=subprocess.DEVNULL,
        )
        info = json.loads(out)
        return float(info["format"]["duration"])
    finally:
        os.unlink(tmp)


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
    _user=Depends(get_current_user),
):
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if file.content_type not in ACCEPTED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {file.content_type}")

    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    suffix = "." + (file.filename or "audio").rsplit(".", 1)[-1]
    try:
        duration = _ffprobe_duration(data, suffix)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read audio duration")

    if duration < settings.MIN_DURATION_SEC:
        raise HTTPException(status_code=422, detail=f"Audio too short (min {settings.MIN_DURATION_SEC}s)")
    if duration > settings.MAX_DURATION_SEC:
        raise HTTPException(status_code=422, detail=f"Audio too long (max {settings.MAX_DURATION_SEC}s)")

    file_id = uuid.uuid4()
    storage_key = f"uploads/{file_id}{suffix}"
    storage.save(storage_key, data)

    record = FileModel(
        id=file_id,
        original_name=file.filename,
        storage_key=storage_key,
        duration_sec=duration,
        size_bytes=len(data),
    )
    db.add(record)
    await db.commit()

    return FileResponse(
        file_id=file_id,
        filename=file.filename or "",
        duration_sec=duration,
        size_bytes=len(data),
    )
