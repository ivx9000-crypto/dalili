from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, IndicatorResult, InsightReview, Project
from app.schemas.core import InsightReviewCreate, InsightReviewOut

router = APIRouter(prefix="/insight-reviews", tags=["insight reviews"])


@router.get("", response_model=list[InsightReviewOut])
def list_insight_reviews(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    indicator_result_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(InsightReview)
    if project_id is not None:
        query = query.filter(InsightReview.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(InsightReview.dataset_id == dataset_id)
    if indicator_result_id is not None:
        query = query.filter(InsightReview.indicator_result_id == indicator_result_id)
    if status is not None:
        query = query.filter(InsightReview.status == status)
    return query.order_by(InsightReview.created_at.desc()).all()


@router.get("/latest", response_model=InsightReviewOut)
def get_latest_insight_review(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(InsightReview)
    if project_id is not None:
        query = query.filter(InsightReview.project_id == project_id)
    review = query.order_by(InsightReview.created_at.desc()).first()
    if not review:
        raise HTTPException(status_code=404, detail="Insight review not found")
    return review


@router.get("/{review_id}", response_model=InsightReviewOut)
def get_insight_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(InsightReview).filter(InsightReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Insight review not found")
    return review


@router.post("", response_model=InsightReviewOut)
def create_insight_review(payload: InsightReviewCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.dataset_id is not None:
        dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Dataset does not belong to the selected project")

    if payload.indicator_result_id is not None:
        result = db.query(IndicatorResult).filter(IndicatorResult.id == payload.indicator_result_id).first()
        if not result:
            raise HTTPException(status_code=404, detail="Indicator result not found")
        if result.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Indicator result does not belong to the selected project")

    review = InsightReview(**payload.model_dump())
    db.add(review)
    db.flush()
    db.add(
        AuditLog(
            action="review",
            entity_type="insight_review",
            entity_id=str(review.id),
            detail=f"{review.status}: {review.title}",
        )
    )
    db.commit()
    db.refresh(review)
    return review
