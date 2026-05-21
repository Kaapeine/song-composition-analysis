from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.db import File, Job
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.tasks import dispatch_task

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def start_analysis(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(File).where(File.id == body.file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    job = Job(file_id=file.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    await dispatch_task(
        background_tasks,
        str(job.id),
        file.storage_key,
        {
            **body.options.model_dump(),
            "_file_id": str(file.id),
            "_filename": file.original_name or "unknown",
        },
    )

    return AnalyzeResponse(job_id=job.id, status=job.status)
