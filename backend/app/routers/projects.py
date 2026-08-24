from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.core import Project, Organisation, AuditLog
from app.schemas.core import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.id == payload.organisation_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    db.add(AuditLog(action="create", entity_type="project", entity_id=str(project.id), detail=project.name))
    db.commit()
    db.refresh(project)
    return project
