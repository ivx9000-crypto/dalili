from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, Project, QualityReport
from app.schemas.core import QualityReportCreate, QualityReportOut

router = APIRouter(prefix="/quality-reports", tags=["quality reports"])


@router.get("", response_model=list[QualityReportOut])
def list_quality_reports(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(QualityReport)
    if project_id is not None:
        query = query.filter(QualityReport.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(QualityReport.dataset_id == dataset_id)
    return query.order_by(QualityReport.created_at.desc()).all()


@router.get("/latest", response_model=QualityReportOut)
def get_latest_quality_report(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(QualityReport)
    if project_id is not None:
        query = query.filter(QualityReport.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(QualityReport.dataset_id == dataset_id)

    report = query.order_by(QualityReport.created_at.desc()).first()
    if not report:
        raise HTTPException(status_code=404, detail="Quality report not found")
    return report


@router.get("/{report_id}", response_model=QualityReportOut)
def get_quality_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(QualityReport).filter(QualityReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Quality report not found")
    return report


@router.post("", response_model=QualityReportOut)
def create_quality_report(payload: QualityReportCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.project_id != payload.project_id:
        raise HTTPException(status_code=400, detail="Dataset does not belong to the selected project")

    report = QualityReport(**payload.model_dump())
    db.add(report)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="quality_report",
            entity_id=str(report.id),
            detail=f"Quality score {report.score}/100 for dataset #{report.dataset_id}",
        )
    )
    db.commit()
    db.refresh(report)
    return report
