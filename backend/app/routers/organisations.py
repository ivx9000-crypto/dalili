from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.core import Organisation, AuditLog
from app.schemas.core import OrganisationCreate, OrganisationOut

router = APIRouter(prefix="/organisations", tags=["organisations"])


@router.get("", response_model=list[OrganisationOut])
def list_organisations(db: Session = Depends(get_db)):
    return db.query(Organisation).order_by(Organisation.created_at.desc()).all()


@router.post("", response_model=OrganisationOut)
def create_organisation(payload: OrganisationCreate, db: Session = Depends(get_db)):
    existing = db.query(Organisation).filter(Organisation.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Organisation name already exists")
    org = Organisation(**payload.model_dump())
    db.add(org)
    db.flush()
    db.add(AuditLog(action="create", entity_type="organisation", entity_id=str(org.id), detail=org.name))
    db.commit()
    db.refresh(org)
    return org
