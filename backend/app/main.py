from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import Base, engine as db_engine
from app.models import core  # noqa: F401 - ensures models are registered
from app.routers import (
    admin_users,
    ai_assistant,
    audit,
    auth,
    compliance_settings,
    datasets,
    document_records,
    engine as engine_router,
    exports,
    health,
    indicator_results,
    insight_reviews,
    map_summaries,
    organisations,
    ops,
    projects,
    quality_reports,
    report_drafts,
    team_members,
)

settings = get_settings()

if settings.auto_create_tables and not settings.is_production:
    # Development convenience only. In production use Alembic migrations.
    Base.metadata.create_all(bind=db_engine)

app = FastAPI(
    title=settings.app_name,
    version="0.62.0",
    description="Backend foundation for the Dalili M&E and research intelligence platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ops.router)
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(organisations.router)
app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(quality_reports.router)
app.include_router(indicator_results.router)
app.include_router(insight_reviews.router)
app.include_router(report_drafts.router)
app.include_router(exports.router)
app.include_router(document_records.router)
app.include_router(team_members.router)
app.include_router(team_members.approvals_router)
app.include_router(compliance_settings.router)
app.include_router(map_summaries.router)
app.include_router(engine_router.router)
app.include_router(ai_assistant.router)
app.include_router(audit.router)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }
