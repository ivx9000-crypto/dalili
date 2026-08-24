from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, IndicatorResult, Project, ReportDraft
from app.schemas.core import ReportDraftCreate, ReportDraftOut

router = APIRouter(prefix="/report-drafts", tags=["report drafts"])


@router.get("", response_model=list[ReportDraftOut])
def list_report_drafts(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    indicator_result_id: int | None = Query(default=None),
    report_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ReportDraft)
    if project_id is not None:
        query = query.filter(ReportDraft.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(ReportDraft.dataset_id == dataset_id)
    if indicator_result_id is not None:
        query = query.filter(ReportDraft.indicator_result_id == indicator_result_id)
    if report_type is not None:
        query = query.filter(ReportDraft.report_type == report_type)
    return query.order_by(ReportDraft.created_at.desc()).all()


@router.get("/latest", response_model=ReportDraftOut)
def get_latest_report_draft(
    project_id: int | None = Query(default=None),
    report_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ReportDraft)
    if project_id is not None:
        query = query.filter(ReportDraft.project_id == project_id)
    if report_type is not None:
        query = query.filter(ReportDraft.report_type == report_type)
    draft = query.order_by(ReportDraft.created_at.desc()).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Report draft not found")
    return draft


@router.get("/{draft_id}", response_model=ReportDraftOut)
def get_report_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(ReportDraft).filter(ReportDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Report draft not found")
    return draft


@router.post("", response_model=ReportDraftOut)
def create_report_draft(payload: ReportDraftCreate, db: Session = Depends(get_db)):
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

    draft = ReportDraft(**payload.model_dump())
    db.add(draft)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="report_draft",
            entity_id=str(draft.id),
            detail=f"{draft.report_type}: {draft.title}",
        )
    )
    db.commit()
    db.refresh(draft)
    return draft
