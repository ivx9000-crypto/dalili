from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    organisation_name: str = ""
    country: str = "Uganda"
    sector: str | None = None
    role: str = "Organisation Admin"


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeactivateMeRequest(BaseModel):
    confirmation: str = ""


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminUserStatusUpdate(BaseModel):
    status: str



class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    primary_role: str
    status: str
    last_login_at: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    token: str
    user: UserOut
    organisation_id: int | None = None
    role: str | None = None


class OrganisationCreate(BaseModel):
    name: str
    country: str = "Uganda"
    sector: str | None = None


class OrganisationOut(OrganisationCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    organisation_id: int
    name: str
    sector: str | None = None
    donor: str | None = None
    geography: str | None = None
    reporting_period: str | None = None
    sensitivity_level: str = "Standard"
    status: str = "Active"


class ProjectOut(ProjectCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DatasetCreate(BaseModel):
    project_id: int
    filename: str
    row_count: int = 0
    column_count: int = 0
    quality_score: int | None = None
    storage_path: str | None = None


class DatasetOut(DatasetCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class QualityReportCreate(BaseModel):
    project_id: int
    dataset_id: int
    file_name: str
    row_count: int = 0
    column_count: int = 0
    score: int = 0
    duplicate_count: int = 0
    readiness_label: str = "Needs review"
    issues_json: str | None = None
    missingness_json: str | None = None
    summary_text: str | None = None


class QualityReportOut(QualityReportCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InsightReviewCreate(BaseModel):
    project_id: int
    dataset_id: int | None = None
    indicator_result_id: int | None = None
    insight_key: str
    title: str
    finding: str
    recommendation: str | None = None
    source: str | None = None
    calculation: str | None = None
    confidence: str = "Medium"
    caveat: str | None = None
    status: str = "pending"
    severity: str = "neutral"
    reviewer: str = "Dalili user"


class InsightReviewOut(InsightReviewCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuditLogOut(BaseModel):
    id: int
    actor: str
    action: str
    entity_type: str
    entity_id: str | None = None
    detail: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IndicatorResultCreate(BaseModel):
    project_id: int
    dataset_id: int | None = None
    file_name: str
    indicator_name: str
    numerator_condition: str
    denominator_condition: str
    numerator_count: int = 0
    denominator_count: int = 0
    percentage: float = 0
    target: float | None = None
    disaggregate_by: str | None = None
    groups_json: str | None = None
    calculation_text: str | None = None


class IndicatorResultOut(IndicatorResultCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReportDraftCreate(BaseModel):
    project_id: int
    dataset_id: int | None = None
    indicator_result_id: int | None = None
    report_type: str = "donor"
    title: str
    file_name: str | None = None
    indicator_name: str | None = None
    quality_score: int | None = None
    insight_summary_json: str | None = None
    report_text: str
    export_format: str = "draft"
    status: str = "draft"
    author: str = "Dalili user"


class ReportDraftOut(ReportDraftCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DocumentRecordCreate(BaseModel):
    project_id: int
    dataset_id: int | None = None
    file_name: str
    file_type: str | None = None
    size_kb: float = 0
    character_count: int = 0
    word_count: int = 0
    paragraph_count: int = 0
    themes_json: str | None = None
    entities_json: str | None = None
    limitations_json: str | None = None
    summary_text: str | None = None
    extracted_text: str | None = None
    author: str = "Dalili user"


class DocumentRecordOut(DocumentRecordCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TeamMemberCreate(BaseModel):
    project_id: int
    name: str
    email: str
    role: str = "Reviewer / Approver"
    status: str = "Invited"


class TeamMemberUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    status: str | None = None


class TeamMemberOut(TeamMemberCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ApprovalSnapshotCreate(BaseModel):
    project_id: int
    approved_count: int = 0
    flagged_count: int = 0
    rejected_count: int = 0
    pending_count: int = 0
    summary_text: str | None = None
    author: str = "Dalili user"


class ApprovalSnapshotOut(ApprovalSnapshotCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ComplianceSettingCreate(BaseModel):
    project_id: int | None = None
    organisation_name: str = ""
    country: str = "Uganda"
    contact_person: str | None = None
    contact_email: str | None = None
    project_purpose: str | None = None
    lawful_basis: str | None = None
    sensitivity_level: str = "medium"
    contains_personal_data: int = 1
    contains_health_data: int = 0
    contains_children_data: int = 0
    contains_financial_data: int = 0
    contains_precise_location: int = 0
    pii_scan_required: int = 1
    reviewer_approval_required: int = 1
    export_logging_enabled: int = 1
    retention_period: str | None = None
    deletion_instruction: str | None = None
    compliance_score: int = 0


class ComplianceSettingOut(ComplianceSettingCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MapSummaryCreate(BaseModel):
    project_id: int
    dataset_id: int | None = None
    file_name: str
    geography_column: str
    total_records: int = 0
    unique_locations: int = 0
    mapped_locations: int = 0
    unmapped_locations: int = 0
    missing_location_count: int = 0
    quality_score: int | None = None
    latest_indicator_name: str | None = None
    latest_indicator_percentage: float | None = None
    location_counts_json: str | None = None
    unmapped_locations_json: str | None = None
    map_insight: str | None = None
    author: str = "Dalili user"


class MapSummaryOut(MapSummaryCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PilotFeedbackCreate(BaseModel):
    project_id: int | None = None
    reviewer_name: str = "Pilot reviewer"
    reviewer_role: str | None = None
    organisation: str | None = None
    page_area: str = "Overall product"
    rating: int = 3
    usefulness: str | None = None
    challenge: str | None = None
    suggested_improvement: str | None = None
    priority: str = "Medium"
    status: str = "new"


class PilotFeedbackOut(PilotFeedbackCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)



class PilotInvitationCreate(BaseModel):
    contact_name: str
    email: str
    organisation: str | None = None
    role: str | None = None
    segment: str = "M&E / Research professional"
    pilot_type: str = "Guided demo"
    priority: str = "Medium"
    notes: str | None = None
    status: str = "Invited"


class PilotInvitationOut(PilotInvitationCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
