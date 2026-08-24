from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, PilotInvitation
from app.schemas.core import PilotInvitationCreate, PilotInvitationOut

router = APIRouter(prefix="/pilot-invitations", tags=["pilot invitations"])


def _audit(db: Session, action: str, entity_id: str | None = None, detail: str | None = None):
    db.add(AuditLog(actor="pilot_onboarding", action=action, entity_type="pilot_invitation", entity_id=entity_id, detail=detail))


@router.get("", response_model=list[PilotInvitationOut])
def list_pilot_invitations(db: Session = Depends(get_db)):
    return db.query(PilotInvitation).order_by(PilotInvitation.created_at.desc()).all()


@router.get("/latest", response_model=PilotInvitationOut | None)
def latest_pilot_invitation(db: Session = Depends(get_db)):
    return db.query(PilotInvitation).order_by(PilotInvitation.created_at.desc()).first()


@router.get("/{invitation_id}", response_model=PilotInvitationOut)
def get_pilot_invitation(invitation_id: int, db: Session = Depends(get_db)):
    item = db.get(PilotInvitation, invitation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pilot invitation not found")
    return item


@router.post("", response_model=PilotInvitationOut)
def create_pilot_invitation(payload: PilotInvitationCreate, db: Session = Depends(get_db)):
    item = PilotInvitation(**payload.model_dump())
    db.add(item)
    db.flush()
    _audit(db, "pilot_invitation_created", str(item.id), f"{item.contact_name} - {item.email}")
    db.commit()
    db.refresh(item)
    return item
