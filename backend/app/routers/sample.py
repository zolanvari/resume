from fastapi import APIRouter

from app.sample_data import SAMPLE_RESUME
from app.schemas import ResumeData

router = APIRouter(prefix="/api", tags=["sample"])


@router.get("/sample", response_model=ResumeData)
def get_sample() -> ResumeData:
    return SAMPLE_RESUME
