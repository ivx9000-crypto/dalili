from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, PilotFeedback, Project
from app.schemas.core import PilotFeedbackCreate, PilotFeedbackOut

router = APIRouter(prefix="/pilot-feedback", tags=["pilot feedback"])


@router.get("", response_model=list[PilotFeedbackOut])
def list_feedback(project_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(PilotFeedback)
    if project_id is not None:
        query = query.filter(PilotFeedback.project_id == project_id)
    return query.order_by(PilotFeedback.created_at.desc()).limit(200).all()


@router.get("/latest", response_model=PilotFeedbackOut | None)
def latest_feedback(project_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(PilotFeedback)
    if project_id is not None:
        query = query.filter(PilotFeedback.project_id == project_id)
    return query.order_by(PilotFeedback.created_at.desc()).first()


@router.get("/{feedback_id}", response_model=PilotFeedbackOut)
def get_feedback(feedback_id: int, db: Session = Depends(get_db)):
    item = db.query(PilotFeedback).filter(PilotFeedback.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return item


@router.post("", response_model=PilotFeedbackOut)
def create_feedback(payload: PilotFeedbackCreate, db: Session = Depends(get_db)):
    if payload.project_id is not None:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    rating = max(1, min(5, payload.rating))
    item = PilotFeedback(**{**payload.model_dump(), "rating": rating})
    db.add(item)
    db.flush()
    db.add(
        AuditLog(
            actor=payload.reviewer_name or "pilot reviewer",
            action="create",
            entity_type="pilot_feedback",
            entity_id=str(item.id),
            detail=f"{payload.page_area} feedback rated {rating}/5",
        )
    )
    db.commit()
    db.refresh(item)
    return item
