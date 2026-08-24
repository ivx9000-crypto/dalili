from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.core import AuditLog, UserAccount, UserSession
from app.schemas.core import AdminUserRoleUpdate, AdminUserStatusUpdate, UserOut

router = APIRouter(prefix="/admin/users", tags=["admin users"])

ADMIN_ROLES = {"Platform Admin", "Organisation Admin"}
VALID_ROLES = ["Platform Admin", "Organisation Admin", "Analyst / M&E Officer", "Reviewer / Approver", "Viewer / Client"]
VALID_STATUSES = ["Active", "Deactivated", "Suspended", "Deleted"]


def _require_admin(user: UserAccount) -> None:
    if user.primary_role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


def _audit(db: Session, actor: str, action: str, detail: str, user_id: int) -> None:
    db.add(AuditLog(actor=actor, action=action, entity_type="user", entity_id=str(user_id), detail=detail))


@router.get("", response_model=list[UserOut])
def list_users(current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    return db.query(UserAccount).order_by(UserAccount.created_at.desc()).all()


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, payload: AdminUserRoleUpdate, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user = db.query(UserAccount).filter(UserAccount.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.primary_role = payload.role
    _audit(db, current_user.email, "admin_change_role", f"Changed user role to {payload.role}", user.id)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(user_id: int, payload: AdminUserStatusUpdate, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    user = db.query(UserAccount).filter(UserAccount.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and payload.status != "Active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot deactivate their own account from admin users")
    user.status = payload.status
    if payload.status != "Active":
        sessions = db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).all()
        from datetime import datetime
        for session in sessions:
            session.revoked_at = datetime.utcnow()
    _audit(db, current_user.email, "admin_change_status", f"Changed user status to {payload.status}", user.id)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: int, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_user_status(user_id, AdminUserStatusUpdate(status="Deactivated"), current_user, db)


@router.patch("/{user_id}/restore", response_model=UserOut)
def restore_user(user_id: int, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_user_status(user_id, AdminUserStatusUpdate(status="Active"), current_user, db)


@router.delete("/{user_id}", response_model=UserOut)
def delete_user(user_id: int, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    # Safe delete for pilot: mark Deleted rather than physically removing records that may be referenced by audit logs.
    return update_user_status(user_id, AdminUserStatusUpdate(status="Deleted"), current_user, db)
