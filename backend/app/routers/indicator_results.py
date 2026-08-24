from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, IndicatorResult, Project
from app.schemas.core import IndicatorResultCreate, IndicatorResultOut

router = APIRouter(prefix="/indicator-results", tags=["indicator results"])


@router.get("", response_model=list[IndicatorResultOut])
def list_indicator_results(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(IndicatorResult)
    if project_id is not None:
        query = query.filter(IndicatorResult.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(IndicatorResult.dataset_id == dataset_id)
    return query.order_by(IndicatorResult.created_at.desc()).all()


@router.get("/latest", response_model=IndicatorResultOut)
def get_latest_indicator_result(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(IndicatorResult)
    if project_id is not None:
        query = query.filter(IndicatorResult.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(IndicatorResult.dataset_id == dataset_id)

    result = query.order_by(IndicatorResult.created_at.desc()).first()
    if not result:
        raise HTTPException(status_code=404, detail="Indicator result not found")
    return result


@router.get("/{result_id}", response_model=IndicatorResultOut)
def get_indicator_result(result_id: int, db: Session = Depends(get_db)):
    result = db.query(IndicatorResult).filter(IndicatorResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Indicator result not found")
    return result


@router.post("", response_model=IndicatorResultOut)
def create_indicator_result(payload: IndicatorResultCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.dataset_id is not None:
        dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Dataset does not belong to the selected project")

    result = IndicatorResult(**payload.model_dump())
    db.add(result)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="indicator_result",
            entity_id=str(result.id),
            detail=f"{result.indicator_name}: {result.numerator_count}/{result.denominator_count} = {result.percentage}%",
        )
    )
    db.commit()
    db.refresh(result)
    return result
