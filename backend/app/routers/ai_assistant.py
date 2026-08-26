import json
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.core import (
    ApprovalSnapshot,
    AuditLog,
    ComplianceSetting,
    Dataset,
    DocumentRecord,
    IndicatorResult,
    InsightReview,
    MapSummary,
    Project,
    QualityReport,
    ReportDraft,
    UserAccount,
)

router = APIRouter(prefix="/ai", tags=["ai assistant"])


class AssistantQuestion(BaseModel):
    question: str
    project_id: int | None = None


def _safe_json(value: str | None, fallback: Any):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except Exception:
        return fallback


def _latest(db: Session, model, project_id: int | None = None):
    query = db.query(model)
    if project_id is not None and hasattr(model, "project_id"):
        query = query.filter(model.project_id == project_id)
    return query.order_by(model.created_at.desc()).first()


def _format_percent(value: float | None) -> str:
    if value is None:
        return "not available"
    return f"{value:.1f}%"


def build_context(db: Session, project_id: int | None = None) -> dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first() if project_id else _latest(db, Project)
    active_project_id = project.id if project else project_id

    dataset = _latest(db, Dataset, active_project_id)
    quality = _latest(db, QualityReport, active_project_id)
    indicator = _latest(db, IndicatorResult, active_project_id)
    report = _latest(db, ReportDraft, active_project_id)
    document = _latest(db, DocumentRecord, active_project_id)
    map_summary = _latest(db, MapSummary, active_project_id)
    approval = _latest(db, ApprovalSnapshot, active_project_id)
    compliance = _latest(db, ComplianceSetting, active_project_id)

    insight_query = db.query(InsightReview)
    if active_project_id is not None:
        insight_query = insight_query.filter(InsightReview.project_id == active_project_id)
    insights = insight_query.order_by(InsightReview.created_at.desc()).limit(20).all()

    insight_counts = {"approved": 0, "flagged": 0, "rejected": 0, "pending": 0}
    for item in insights:
        key = (item.status or "pending").lower()
        insight_counts[key] = insight_counts.get(key, 0) + 1

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "sector": project.sector,
            "donor": project.donor,
            "geography": project.geography,
            "reporting_period": project.reporting_period,
            "sensitivity_level": project.sensitivity_level,
        }
        if project
        else None,
        "dataset": {
            "id": dataset.id,
            "filename": dataset.filename,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "quality_score": dataset.quality_score,
            "created_at": dataset.created_at.isoformat(),
        }
        if dataset
        else None,
        "quality_report": {
            "id": quality.id,
            "file_name": quality.file_name,
            "score": quality.score,
            "row_count": quality.row_count,
            "column_count": quality.column_count,
            "duplicate_count": quality.duplicate_count,
            "readiness_label": quality.readiness_label,
            "issues": _safe_json(quality.issues_json, []),
            "missingness": _safe_json(quality.missingness_json, []),
            "summary_text": quality.summary_text,
        }
        if quality
        else None,
        "indicator_result": {
            "id": indicator.id,
            "indicator_name": indicator.indicator_name,
            "numerator_count": indicator.numerator_count,
            "denominator_count": indicator.denominator_count,
            "percentage": indicator.percentage,
            "target": indicator.target,
            "disaggregate_by": indicator.disaggregate_by,
            "calculation_text": indicator.calculation_text,
            "groups": _safe_json(indicator.groups_json, []),
        }
        if indicator
        else None,
        "insight_counts": insight_counts,
        "latest_insights": [
            {
                "id": item.id,
                "title": item.title,
                "finding": item.finding,
                "recommendation": item.recommendation,
                "status": item.status,
                "confidence": item.confidence,
                "source": item.source,
                "calculation": item.calculation,
            }
            for item in insights[:5]
        ],
        "report_draft": {
            "id": report.id,
            "title": report.title,
            "report_type": report.report_type,
            "status": report.status,
            "quality_score": report.quality_score,
            "report_text_excerpt": (report.report_text or "")[:600],
        }
        if report
        else None,
        "document_record": {
            "id": document.id,
            "file_name": document.file_name,
            "word_count": document.word_count,
            "paragraph_count": document.paragraph_count,
            "themes": _safe_json(document.themes_json, []),
            "entities": _safe_json(document.entities_json, []),
            "summary_text": document.summary_text,
        }
        if document
        else None,
        "map_summary": {
            "id": map_summary.id,
            "geography_column": map_summary.geography_column,
            "total_records": map_summary.total_records,
            "unique_locations": map_summary.unique_locations,
            "mapped_locations": map_summary.mapped_locations,
            "unmapped_locations": map_summary.unmapped_locations,
            "missing_location_count": map_summary.missing_location_count,
            "map_insight": map_summary.map_insight,
        }
        if map_summary
        else None,
        "approval_snapshot": {
            "id": approval.id,
            "approved_count": approval.approved_count,
            "flagged_count": approval.flagged_count,
            "rejected_count": approval.rejected_count,
            "pending_count": approval.pending_count,
            "summary_text": approval.summary_text,
        }
        if approval
        else None,
        "compliance_setting": {
            "id": compliance.id,
            "organisation_name": compliance.organisation_name,
            "country": compliance.country,
            "sensitivity_level": compliance.sensitivity_level,
            "contains_personal_data": bool(compliance.contains_personal_data),
            "contains_health_data": bool(compliance.contains_health_data),
            "pii_scan_required": bool(compliance.pii_scan_required),
            "reviewer_approval_required": bool(compliance.reviewer_approval_required),
            "export_logging_enabled": bool(compliance.export_logging_enabled),
            "compliance_score": compliance.compliance_score,
        }
        if compliance
        else None,
    }


def answer_question(question: str, context: dict[str, Any]) -> str:
    q = question.lower().strip()
    project = context.get("project")
    dataset = context.get("dataset")
    quality = context.get("quality_report")
    indicator = context.get("indicator_result")
    insights = context.get("insight_counts") or {}
    report = context.get("report_draft")
    document = context.get("document_record")
    map_summary = context.get("map_summary")
    compliance = context.get("compliance_setting")

    if not any([project, dataset, quality, indicator, report, document, map_summary, compliance]):
        return "I cannot find backend project context yet. Create or select a backend project, upload a dataset, and run a backend DQA or indicator before asking for project guidance."


    if any(term in q for term in ["m&e plan", "me plan", "monitoring plan", "what should", "track", "collect", "setup", "set up", "no m&e"]):
        if not project:
            return "Start by creating a backend-saved project with project name, sector, geography, target group, donor/client and reporting period. After that, I can suggest a simple M&E plan and evidence checklist."
        sector = (project.get("sector") or "general project").lower()
        suggested = [
            "people or sites reached",
            "activities completed against the workplan",
            "target achievement",
            "beneficiary/client satisfaction",
            "location and group breakdowns",
            "barriers, risks and corrective actions",
        ]
        if any(term in sector for term in ["health", "hiv", "srh", "clinic"]):
            suggested = ["clients reached with services", "eligible clients receiving intended service", "referral completion", "client satisfaction", "age/sex/location breakdown", "service availability or stock-out issues"]
        elif any(term in sector for term in ["education", "training", "skills", "school"]):
            suggested = ["learners enrolled", "attendance", "completion", "skills or learning improvement", "employment/internship outcome where relevant", "learner satisfaction and barriers"]
        elif any(term in sector for term in ["agric", "farmer", "livelihood", "food"]):
            suggested = ["farmers/participants reached", "training completion", "adoption of promoted practices", "access to inputs or markets", "income/yield improvement where follow-up data exists", "gender/location breakdown"]
        return (
            f"For {project.get('name')}, a simple M&E plan should track: " + "; ".join(suggested) + ". "
            "Evidence to collect: beneficiary or participant register, activity attendance/completion sheet, service or output tracker, short feedback/satisfaction form, location field, and any follow-up outcome evidence. "
            "Recommended process: upload evidence, run a quality check, track one or two priority results first, review Dalili's findings, then create a short donor/client update. "
            "Keep it simple: start with reach, completion, target achievement, satisfaction and who is being left out."
        )

    if any(term in q for term in ["quality", "dqa", "missing", "duplicate", "clean"]):
        if not quality:
            return "I cannot find a backend-saved quality report yet. Run Backend DQA from Data Room or Quality Check first."
        missing = quality.get("missingness") or []
        top_missing = "; ".join(
            f"{item.get('column', 'column')}: {item.get('missing', 0)} missing" for item in missing[:3] if isinstance(item, dict)
        )
        return (
            f"Backend DQA for {quality.get('file_name')} has a quality score of {quality.get('score')}/100 and readiness label "
            f"'{quality.get('readiness_label')}'. It covers {quality.get('row_count')} rows and {quality.get('column_count')} columns, "
            f"with {quality.get('duplicate_count')} duplicate rows. "
            f"{('Top missingness issues: ' + top_missing + '.') if top_missing else 'No top missingness issue is available in the saved backend context.'} "
            "Use this as the data-confidence paragraph in reports and avoid overinterpreting indicators based on high-missing columns."
        )

    if any(term in q for term in ["indicator", "target", "calculation", "performance", "result"]):
        if not indicator:
            return "I cannot find a backend-saved tracked result yet. Use Track Results to calculate and save a result first."
        target = indicator.get("target")
        gap = None if target is None else float(target) - float(indicator.get("percentage") or 0)
        return (
            f"{indicator.get('indicator_name')} is {_format_percent(indicator.get('percentage'))}, calculated as "
            f"{indicator.get('numerator_count')} / {indicator.get('denominator_count')}. "
            f"{('Target: ' + _format_percent(target) + '; gap: ' + _format_percent(gap) + '.') if target is not None else 'No target is saved for this result.'} "
            f"Calculation trace: {indicator.get('calculation_text') or 'not available'}. "
            "Report this with numerator, denominator, filters, and relevant data-quality caveats."
        )

    if any(term in q for term in ["insight", "approve", "approval", "review", "action", "recommend"]):
        return (
            f"Insight review status in backend: {insights.get('approved', 0)} approved, {insights.get('flagged', 0)} flagged, "
            f"{insights.get('rejected', 0)} rejected, and {insights.get('pending', 0)} pending. "
            "Recommended action: move only approved insights into donor-facing reports. Flagged insights should be checked against the source calculation and DQA limitations before use."
        )

    if any(term in q for term in ["report", "donor", "narrative", "summary"]):
        parts = []
        if project:
            parts.append(f"Project: {project.get('name')} ({project.get('sector') or 'sector not specified'}).")
        if dataset:
            parts.append(f"Dataset scope: {dataset.get('filename')} with {dataset.get('row_count')} records and {dataset.get('column_count')} columns.")
        if indicator:
            parts.append(f"Key result: {indicator.get('indicator_name')} = {_format_percent(indicator.get('percentage'))} ({indicator.get('numerator_count')}/{indicator.get('denominator_count')}).")
        if quality:
            parts.append(f"Data confidence: DQA score {quality.get('score')}/100; {quality.get('duplicate_count')} duplicate rows; readiness '{quality.get('readiness_label')}'.")
        parts.append(f"Review status: {insights.get('approved', 0)} approved, {insights.get('flagged', 0)} flagged, {insights.get('pending', 0)} pending.")
        if report:
            parts.append(f"Latest saved draft: {report.get('title')} ({report.get('report_type')}).")
        return " ".join(parts)

    if any(term in q for term in ["document", "docx", "pdf", "transcript", "theme"]):
        if not document:
            return "I cannot find a backend-saved document record yet. Upload and extract a document from the Documents page first."
        return (
            f"Latest document: {document.get('file_name')} with about {document.get('word_count')} words and {document.get('paragraph_count')} paragraphs. "
            f"Detected themes: {', '.join(document.get('themes') or []) or 'not available'}. "
            f"Summary: {document.get('summary_text') or 'No backend summary text is saved yet.'}"
        )

    if any(term in q for term in ["map", "district", "subcounty", "location", "geography"]):
        if not map_summary:
            return "I cannot find a backend-saved map summary yet. Run the Maps backend summary after choosing a geography column."
        return (
            f"Map summary used '{map_summary.get('geography_column')}' as the geography column. It found "
            f"{map_summary.get('unique_locations')} unique locations, {map_summary.get('mapped_locations')} mapped locations, "
            f"{map_summary.get('unmapped_locations')} unmapped locations, and {map_summary.get('missing_location_count')} records missing location. "
            f"Insight: {map_summary.get('map_insight') or 'No map insight is saved yet.'}"
        )

    if any(term in q for term in ["compliance", "privacy", "pii", "sensitive", "protection"]):
        if not compliance:
            return "I cannot find backend-saved compliance settings yet. Complete Settings & Compliance and save to backend."
        return (
            f"Compliance readiness score is {compliance.get('compliance_score')}/100 for {compliance.get('organisation_name')}. "
            f"Sensitivity is '{compliance.get('sensitivity_level')}'. Personal data: {compliance.get('contains_personal_data')}; health data: {compliance.get('contains_health_data')}. "
            f"PII scan required: {compliance.get('pii_scan_required')}; reviewer approval required: {compliance.get('reviewer_approval_required')}; export logging enabled: {compliance.get('export_logging_enabled')}."
        )

    return (
        "I can answer using backend-saved Dalili context: project, dataset, DQA, indicator, insights, reports, documents, maps, and compliance settings. "
        "Ask for a simple M&E plan, what to track, evidence to collect, latest tracked result, DQA caveats, donor report wording, map summary, document themes, or compliance status."
    )


@router.get("/context")
def get_ai_context(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    context = build_context(db, project_id)
    db.add(AuditLog(actor=current_user.email, action="read", entity_type="ai_context", detail="Loaded backend AI context"))
    db.commit()
    return context


@router.post("/respond")
def respond(
    payload: AssistantQuestion,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    context = build_context(db, payload.project_id)
    answer = answer_question(payload.question, context)
    db.add(AuditLog(actor=current_user.email, action="generate", entity_type="ai_response", detail=payload.question[:500]))
    db.commit()
    return {"answer": answer, "context": context, "mode": "backend-rule-based"}
