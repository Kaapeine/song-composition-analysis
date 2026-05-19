from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class FileResponse(BaseModel):
    file_id: UUID
    filename: str
    duration_sec: float
    size_bytes: int


class AnalyzeOptions(BaseModel):
    detect_mode: bool = True
    include_stems: bool = False


class AnalyzeRequest(BaseModel):
    file_id: UUID
    options: AnalyzeOptions = AnalyzeOptions()


class AnalyzeResponse(BaseModel):
    job_id: UUID
    status: str


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: str
    stage: str | None = None
    progress: int = 0
    created_at: datetime
    result: Any | None = None
    error: str | None = None

    model_config = {"from_attributes": True}
