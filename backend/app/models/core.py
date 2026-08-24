from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(500))
    primary_role: Mapped[str] = mapped_column(String(120), default="Organisation Admin")
    status: Mapped[str] = mapped_column(String(80), default="Active")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memberships: Mapped[list["OrganisationMembership"]] = relationship(back_populates="user")
    sessions: Mapped[list["UserSession"]] = relationship(back_populates="user")


class OrganisationMembership(Base):
    __tablename__ = "organisation_memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.id"), index=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"), index=True)
    role: Mapped[str] = mapped_column(String(120), default="Analyst / M&E Officer")
    status: Mapped[str] = mapped_column(String(80), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount] = relationship(back_populates="memberships")
    organisation: Mapped["Organisation"] = relationship(back_populates="memberships")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount] = relationship(back_populates="sessions")


class Organisation(Base):
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    country: Mapped[str] = mapped_column(String(120), default="Uganda")
    sector: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    projects: Mapped[list["Project"]] = relationship(back_populates="organisation")
    memberships: Mapped[list["OrganisationMembership"]] = relationship(back_populates="organisation")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organisation_id: Mapped[int] = mapped_column(ForeignKey("organisations.id"))
    name: Mapped[str] = mapped_column(String(255), index=True)
    sector: Mapped[str | None] = mapped_column(String(160), nullable=True)
    donor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    geography: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reporting_period: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sensitivity_level: Mapped[str] = mapped_column(String(80), default="Standard")
    status: Mapped[str] = mapped_column(String(80), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organisation: Mapped[Organisation] = relationship(back_populates="projects")
    datasets: Mapped[list["Dataset"]] = relationship(back_populates="project")
    quality_reports: Mapped[list["QualityReport"]] = relationship(back_populates="project")
    indicator_results: Mapped[list["IndicatorResult"]] = relationship(back_populates="project")
    insight_reviews: Mapped[list["InsightReview"]] = relationship(back_populates="project")
    report_drafts: Mapped[list["ReportDraft"]] = relationship(back_populates="project")
    document_records: Mapped[list["DocumentRecord"]] = relationship(back_populates="project")
    team_members: Mapped[list["TeamMember"]] = relationship(back_populates="project")
    approval_snapshots: Mapped[list["ApprovalSnapshot"]] = relationship(back_populates="project")
    map_summaries: Mapped[list["MapSummary"]] = relationship(back_populates="project")


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    filename: Mapped[str] = mapped_column(String(255))
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="datasets")
    quality_reports: Mapped[list["QualityReport"]] = relationship(back_populates="dataset")
    indicator_results: Mapped[list["IndicatorResult"]] = relationship(back_populates="dataset")
    insight_reviews: Mapped[list["InsightReview"]] = relationship(back_populates="dataset")
    report_drafts: Mapped[list["ReportDraft"]] = relationship(back_populates="dataset")
    document_records: Mapped[list["DocumentRecord"]] = relationship(back_populates="dataset")
    map_summaries: Mapped[list["MapSummary"]] = relationship(back_populates="dataset")


class QualityReport(Base):
    __tablename__ = "quality_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    readiness_label: Mapped[str] = mapped_column(String(80), default="Needs review")
    issues_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    missingness_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="quality_reports")
    dataset: Mapped[Dataset] = relationship(back_populates="quality_reports")


class IndicatorResult(Base):
    __tablename__ = "indicator_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"), index=True, nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    indicator_name: Mapped[str] = mapped_column(String(255), index=True)
    numerator_condition: Mapped[str] = mapped_column(Text)
    denominator_condition: Mapped[str] = mapped_column(Text)
    numerator_count: Mapped[int] = mapped_column(Integer, default=0)
    denominator_count: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[float] = mapped_column(Float, default=0)
    target: Mapped[float | None] = mapped_column(Float, nullable=True)
    disaggregate_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    groups_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    calculation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="indicator_results")
    dataset: Mapped[Dataset | None] = relationship(back_populates="indicator_results")
    report_drafts: Mapped[list["ReportDraft"]] = relationship(back_populates="indicator_result")


class InsightReview(Base):
    __tablename__ = "insight_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"), index=True, nullable=True)
    indicator_result_id: Mapped[int | None] = mapped_column(ForeignKey("indicator_results.id"), index=True, nullable=True)
    insight_key: Mapped[str] = mapped_column(String(160), index=True)
    title: Mapped[str] = mapped_column(String(255))
    finding: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    calculation: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str] = mapped_column(String(80), default="Medium")
    caveat: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(80), default="pending")
    severity: Mapped[str] = mapped_column(String(80), default="neutral")
    reviewer: Mapped[str] = mapped_column(String(160), default="Dalili user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="insight_reviews")
    dataset: Mapped[Dataset | None] = relationship(back_populates="insight_reviews")
    indicator_result: Mapped[IndicatorResult | None] = relationship()


class ReportDraft(Base):
    __tablename__ = "report_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"), index=True, nullable=True)
    indicator_result_id: Mapped[int | None] = mapped_column(ForeignKey("indicator_results.id"), index=True, nullable=True)
    report_type: Mapped[str] = mapped_column(String(80), default="donor")
    title: Mapped[str] = mapped_column(String(255))
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    indicator_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    insight_summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_text: Mapped[str] = mapped_column(Text)
    export_format: Mapped[str] = mapped_column(String(80), default="draft")
    status: Mapped[str] = mapped_column(String(80), default="draft")
    author: Mapped[str] = mapped_column(String(160), default="Dalili user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="report_drafts")
    dataset: Mapped[Dataset | None] = relationship(back_populates="report_drafts")
    indicator_result: Mapped[IndicatorResult | None] = relationship(back_populates="report_drafts")


class DocumentRecord(Base):
    __tablename__ = "document_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"), index=True, nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str | None] = mapped_column(String(160), nullable=True)
    size_kb: Mapped[float] = mapped_column(Float, default=0)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    paragraph_count: Mapped[int] = mapped_column(Integer, default=0)
    themes_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    entities_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    limitations_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str] = mapped_column(String(160), default="Dalili user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="document_records")
    dataset: Mapped[Dataset | None] = relationship(back_populates="document_records")


class MapSummary(Base):
    __tablename__ = "map_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("datasets.id"), index=True, nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    geography_column: Mapped[str] = mapped_column(String(255))
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    unique_locations: Mapped[int] = mapped_column(Integer, default=0)
    mapped_locations: Mapped[int] = mapped_column(Integer, default=0)
    unmapped_locations: Mapped[int] = mapped_column(Integer, default=0)
    missing_location_count: Mapped[int] = mapped_column(Integer, default=0)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latest_indicator_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latest_indicator_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_counts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    unmapped_locations_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    map_insight: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str] = mapped_column(String(160), default="Dalili user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="map_summaries")
    dataset: Mapped[Dataset | None] = relationship(back_populates="map_summaries")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor: Mapped[str] = mapped_column(String(160), default="system")
    action: Mapped[str] = mapped_column(String(160))
    entity_type: Mapped[str] = mapped_column(String(160))
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(120), default="Reviewer / Approver")
    status: Mapped[str] = mapped_column(String(80), default="Invited")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="team_members")


class ApprovalSnapshot(Base):
    __tablename__ = "approval_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    approved_count: Mapped[int] = mapped_column(Integer, default=0)
    flagged_count: Mapped[int] = mapped_column(Integer, default=0)
    rejected_count: Mapped[int] = mapped_column(Integer, default=0)
    pending_count: Mapped[int] = mapped_column(Integer, default=0)
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str] = mapped_column(String(160), default="Dalili user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="approval_snapshots")


class ComplianceSetting(Base):
    __tablename__ = "compliance_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    organisation_name: Mapped[str] = mapped_column(String(255), default="")
    country: Mapped[str] = mapped_column(String(120), default="Uganda")
    contact_person: Mapped[str | None] = mapped_column(String(160), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    lawful_basis: Mapped[str | None] = mapped_column(Text, nullable=True)
    sensitivity_level: Mapped[str] = mapped_column(String(80), default="medium")
    contains_personal_data: Mapped[int] = mapped_column(Integer, default=1)
    contains_health_data: Mapped[int] = mapped_column(Integer, default=0)
    contains_children_data: Mapped[int] = mapped_column(Integer, default=0)
    contains_financial_data: Mapped[int] = mapped_column(Integer, default=0)
    contains_precise_location: Mapped[int] = mapped_column(Integer, default=0)
    pii_scan_required: Mapped[int] = mapped_column(Integer, default=1)
    reviewer_approval_required: Mapped[int] = mapped_column(Integer, default=1)
    export_logging_enabled: Mapped[int] = mapped_column(Integer, default=1)
    retention_period: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deletion_instruction: Mapped[str | None] = mapped_column(Text, nullable=True)
    compliance_score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project | None] = relationship()


class PilotFeedback(Base):
    __tablename__ = "pilot_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    reviewer_name: Mapped[str] = mapped_column(String(160), default="Pilot reviewer")
    reviewer_role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    organisation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    page_area: Mapped[str] = mapped_column(String(160), default="Overall product")
    rating: Mapped[int] = mapped_column(Integer, default=3)
    usefulness: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenge: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_improvement: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(80), default="Medium")
    status: Mapped[str] = mapped_column(String(80), default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project | None] = relationship()


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[UserAccount] = relationship()



class PilotInvitation(Base):
    __tablename__ = "pilot_invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contact_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), index=True)
    organisation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    segment: Mapped[str] = mapped_column(String(160), default="M&E / Research professional")
    pilot_type: Mapped[str] = mapped_column(String(160), default="Guided demo")
    priority: Mapped[str] = mapped_column(String(80), default="Medium")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(80), default="Invited")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
