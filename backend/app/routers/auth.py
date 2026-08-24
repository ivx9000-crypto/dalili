from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_token, extract_bearer_token, get_current_user, hash_password, token_expiry, verify_password
from app.db.session import get_db
from app.models.core import AuditLog, Organisation, OrganisationMembership, PasswordResetToken, UserAccount, UserSession
from app.schemas.core import (
    AuthResponse,
    ChangePasswordRequest,
    DeactivateMeRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
RESET_TOKEN_MINUTES = 30


def _record_audit(db: Session, actor: str, action: str, detail: str, entity_type: str = "auth", entity_id: str | None = None) -> None:
    db.add(AuditLog(actor=actor, action=action, entity_type=entity_type, entity_id=entity_id, detail=detail))


def _issue_session(db: Session, user: UserAccount) -> str:
    token = create_token()
    db.add(UserSession(user_id=user.id, token=token, expires_at=token_expiry()))
    user.last_login_at = datetime.utcnow()
    return token


def _revoke_user_sessions(db: Session, user_id: int) -> None:
    sessions = db.query(UserSession).filter(UserSession.user_id == user_id, UserSession.revoked_at.is_(None)).all()
    for session in sessions:
        session.revoked_at = datetime.utcnow()


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(UserAccount).filter(UserAccount.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    organisation = db.query(Organisation).filter(Organisation.name == payload.organisation_name.strip()).first()
    if not organisation:
        organisation = Organisation(name=payload.organisation_name.strip(), country=payload.country, sector=payload.sector)
        db.add(organisation)
        db.flush()

    try:
        password_hash = hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user = UserAccount(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        password_hash=password_hash,
        primary_role=payload.role,
    )
    db.add(user)
    db.flush()

    membership_role = payload.role if payload.role in ["Platform Admin", "Organisation Admin", "Analyst / M&E Officer", "Reviewer / Approver", "Viewer / Client"] else "Organisation Admin"
    db.add(OrganisationMembership(user_id=user.id, organisation_id=organisation.id, role=membership_role, status="Active"))

    token = _issue_session(db, user)
    _record_audit(db, user.email, "signup", f"Created user account and organisation membership for {organisation.name}", "user", str(user.id))
    db.commit()
    db.refresh(user)
    return AuthResponse(token=token, user=user, organisation_id=organisation.id, role=membership_role)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter(UserAccount.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.status != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"This account is {user.status.lower()} and cannot log in")

    membership = db.query(OrganisationMembership).filter(OrganisationMembership.user_id == user.id, OrganisationMembership.status == "Active").first()
    token = _issue_session(db, user)
    _record_audit(db, user.email, "login", "User logged in", "user", str(user.id))
    db.commit()
    db.refresh(user)
    return AuthResponse(token=token, user=user, organisation_id=membership.organisation_id if membership else None, role=membership.role if membership else user.primary_role)


@router.get("/me", response_model=UserOut)
def me(current_user: UserAccount = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = extract_bearer_token(authorization)
    if token:
        session = db.query(UserSession).filter(UserSession.token == token, UserSession.revoked_at.is_(None)).first()
        if session:
            session.revoked_at = datetime.utcnow()
            _record_audit(db, "current-user", "logout", "User logged out", "session", str(session.id))
            db.commit()
    return {"status": "ok"}


@router.post("/logout-all")
def logout_all(current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    _revoke_user_sessions(db, current_user.id)
    _record_audit(db, current_user.email, "logout_all", "User revoked all active sessions", "user", str(current_user.id))
    db.commit()
    return {"status": "ok", "message": "All sessions have been revoked."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter(UserAccount.email == payload.email.lower().strip()).first()
    if not user or user.status != "Active":
        # Do not reveal whether an email exists in production. For local demo we still return a neutral status.
        return {"status": "ok", "message": "If the account exists, a reset link has been prepared."}

    token = create_token()
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_MINUTES))
    db.add(reset)
    _record_audit(db, user.email, "forgot_password", "Password reset token created for local development", "user", str(user.id))
    db.commit()
    return {
        "status": "ok",
        "message": "Local development reset token created. In production this would be emailed.",
        "reset_token": token,
        "reset_url": f"/reset-password?token={token}",
        "expires_in_minutes": RESET_TOKEN_MINUTES,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    if not reset or reset.used_at is not None or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user = db.query(UserAccount).filter(UserAccount.id == reset.user_id).first()
    if not user or user.status != "Active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is not active")

    try:
        user.password_hash = hash_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    reset.used_at = datetime.utcnow()
    _revoke_user_sessions(db, user.id)
    _record_audit(db, user.email, "reset_password", "User reset password and active sessions were revoked", "user", str(user.id))
    db.commit()
    return {"status": "ok", "message": "Password reset successfully. Please log in again."}


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter(UserAccount.id == current_user.id).first()
    if not user or not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    try:
        user.password_hash = hash_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    _record_audit(db, user.email, "change_password", "User changed password", "user", str(user.id))
    db.commit()
    return {"status": "ok", "message": "Password changed successfully."}


@router.post("/deactivate-me")
def deactivate_me(payload: DeactivateMeRequest, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.confirmation.strip().upper() != "DELETE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type DELETE to confirm account deactivation")
    user = db.query(UserAccount).filter(UserAccount.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = "Deactivated"
    _revoke_user_sessions(db, user.id)
    _record_audit(db, user.email, "deactivate_me", "User deactivated own account", "user", str(user.id))
    db.commit()
    return {"status": "ok", "message": "Your account has been deactivated."}


@router.get("/roles")
def roles():
    return [
        {"name": "Platform Admin", "description": "Can administer the full Dalili platform."},
        {"name": "Organisation Admin", "description": "Can manage one organisation, users, projects and settings."},
        {"name": "Analyst / M&E Officer", "description": "Can upload data, run checks, define indicators and prepare reports."},
        {"name": "Reviewer / Approver", "description": "Can review, approve, flag or reject findings and reports."},
        {"name": "Viewer / Client", "description": "Can view approved dashboards, reports and outputs only."},
    ]

@router.get("/oauth/providers")
def oauth_providers():
    return {
        "status": "configured_for_ui",
        "providers": [
            {"name": "google", "label": "Google", "enabled": False, "note": "Enable after adding Google OAuth client ID, secret and production callback URL."},
            {"name": "microsoft", "label": "Microsoft", "enabled": False, "note": "Enable after adding Microsoft Entra/Azure app credentials and callback URL."},
        ],
    }


@router.get("/security/options")
def security_options():
    return {
        "two_factor": {
            "available": True,
            "mandatory": False,
            "recommended_for": ["Platform Admin", "Organisation Admin"],
            "methods": ["authenticator_app", "email_code"],
            "sms": "not recommended for first release because of cost and reliability",
        },
        "email_verification": {
            "available": True,
            "enforced_in_production_after_email_service_setup": True,
        },
    }
