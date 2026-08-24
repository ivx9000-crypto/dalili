from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, ComplianceSetting, Project
from app.schemas.core import ComplianceSettingCreate, ComplianceSettingOut

router = APIRouter(prefix="/compliance-settings", tags=["compliance settings"])


@router.get("", response_model=list[ComplianceSettingOut])
def list_compliance_settings(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(ComplianceSetting)
    if project_id is not None:
        query = query.filter(ComplianceSetting.project_id == project_id)
    return query.order_by(ComplianceSetting.created_at.desc()).all()


@router.get("/latest", response_model=ComplianceSettingOut)
def get_latest_compliance_setting(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(ComplianceSetting)
    if project_id is not None:
        query = query.filter(ComplianceSetting.project_id == project_id)
    record = query.order_by(ComplianceSetting.created_at.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance settings not found")
    return record


@router.get("/{setting_id}", response_model=ComplianceSettingOut)
def get_compliance_setting(setting_id: int, db: Session = Depends(get_db)):
    record = db.query(ComplianceSetting).filter(ComplianceSetting.id == setting_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance settings not found")
    return record


@router.post("", response_model=ComplianceSettingOut)
def create_compliance_setting(payload: ComplianceSettingCreate, db: Session = Depends(get_db)):
    if payload.project_id is not None:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    record = ComplianceSetting(**payload.model_dump())
    db.add(record)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="compliance_setting",
            entity_id=str(record.id),
            detail=f"{record.organisation_name} | score {record.compliance_score}% | {record.sensitivity_level}",
        )
    )
    db.commit()
    db.refresh(record)
    return record
