import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_storage
from app.models.db import File
from app.storage import StorageBackend

router = APIRouter()

_MEDIA_TYPES = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "aiff": "audio/aiff",
}


@router.get("/files/{file_id}/audio")
async def stream_audio(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    file = await db.get(File, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    data = storage.load(file.storage_key)
    suffix = file.storage_key.rsplit(".", 1)[-1].lower()
    media_type = _MEDIA_TYPES.get(suffix, "audio/mpeg")
    return Response(content=data, media_type=media_type)
