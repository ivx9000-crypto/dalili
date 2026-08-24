from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import ApprovalSnapshot, AuditLog, Project, TeamMember
from app.schemas.core import ApprovalSnapshotCreate, ApprovalSnapshotOut, TeamMemberCreate, TeamMemberOut, TeamMemberUpdate

router = APIRouter(prefix="/team-members", tags=["team members"])
approvals_router = APIRouter(prefix="/approval-snapshots", tags=["approval snapshots"])


@router.get("", response_model=list[TeamMemberOut])
def list_team_members(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(TeamMember)
    if project_id is not None:
        query = query.filter(TeamMember.project_id == project_id)
    return query.order_by(TeamMember.created_at.desc()).all()


@router.post("", response_model=TeamMemberOut)
def create_team_member(payload: TeamMemberCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    member = TeamMember(**payload.model_dump())
    db.add(member)
    db.flush()
    db.add(AuditLog(action="create", entity_type="team_member", entity_id=str(member.id), detail=f"{member.name} | {member.role}"))
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=TeamMemberOut)
def update_team_member(member_id: int, payload: TeamMemberUpdate, db: Session = Depends(get_db)):
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, key, value)
    db.add(AuditLog(action="update", entity_type="team_member", entity_id=str(member.id), detail=f"{member.name} | {member.role}"))
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}")
def delete_team_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    detail = f"{member.name} | {member.email}"
    db.delete(member)
    db.add(AuditLog(action="delete", entity_type="team_member", entity_id=str(member_id), detail=detail))
    db.commit()
    return {"status": "deleted", "id": member_id}


@approvals_router.get("", response_model=list[ApprovalSnapshotOut])
def list_approval_snapshots(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(ApprovalSnapshot)
    if project_id is not None:
        query = query.filter(ApprovalSnapshot.project_id == project_id)
    return query.order_by(ApprovalSnapshot.created_at.desc()).all()


@approvals_router.get("/latest", response_model=ApprovalSnapshotOut)
def get_latest_approval_snapshot(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(ApprovalSnapshot)
    if project_id is not None:
        query = query.filter(ApprovalSnapshot.project_id == project_id)
    snapshot = query.order_by(ApprovalSnapshot.created_at.desc()).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Approval snapshot not found")
    return snapshot


@approvals_router.post("", response_model=ApprovalSnapshotOut)
def create_approval_snapshot(payload: ApprovalSnapshotCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    snapshot = ApprovalSnapshot(**payload.model_dump())
    db.add(snapshot)
    db.flush()
    db.add(AuditLog(action="create", entity_type="approval_snapshot", entity_id=str(snapshot.id), detail=payload.summary_text or "Approval snapshot saved"))
    db.commit()
    db.refresh(snapshot)
    return snapshot
