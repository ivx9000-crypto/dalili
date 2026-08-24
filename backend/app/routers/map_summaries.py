from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, MapSummary, Project
from app.schemas.core import MapSummaryCreate, MapSummaryOut

router = APIRouter(prefix="/map-summaries", tags=["map summaries"])


@router.get("", response_model=list[MapSummaryOut])
def list_map_summaries(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(MapSummary)
    if project_id is not None:
        query = query.filter(MapSummary.project_id == project_id)
    return query.order_by(MapSummary.created_at.desc()).all()


@router.get("/latest", response_model=MapSummaryOut)
def get_latest_map_summary(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(MapSummary)
    if project_id is not None:
        query = query.filter(MapSummary.project_id == project_id)
    record = query.order_by(MapSummary.created_at.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="Map summary not found")
    return record


@router.get("/{summary_id}", response_model=MapSummaryOut)
def get_map_summary(summary_id: int, db: Session = Depends(get_db)):
    record = db.query(MapSummary).filter(MapSummary.id == summary_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Map summary not found")
    return record


@router.post("", response_model=MapSummaryOut)
def create_map_summary(payload: MapSummaryCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.dataset_id is not None:
        dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

    record = MapSummary(**payload.model_dump())
    db.add(record)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="map_summary",
            entity_id=str(record.id),
            detail=f"{record.file_name} | {record.geography_column} | {record.mapped_locations} mapped, {record.unmapped_locations} unmapped",
        )
    )
    db.commit()
    db.refresh(record)
    return record
