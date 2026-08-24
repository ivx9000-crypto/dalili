from pathlib import Path
from fastapi import APIRouter
from sqlalchemy import inspect, text
from app.core.config import get_settings
from app.db.session import engine

router = APIRouter(prefix="/ops", tags=["operations"])
settings = get_settings()


def _db_status() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ok": True, "message": "Database connection successful."}
    except Exception as exc:  # pragma: no cover - returned for operator visibility
        return {"ok": False, "message": str(exc)}


@router.get("/readiness")
def readiness():
    storage_dir = Path("app/storage/uploads")
    storage_dir.mkdir(parents=True, exist_ok=True)
    db = _db_status()
    checks = [
        {
            "name": "Backend application",
            "ok": True,
            "message": f"{settings.app_name} is running in {settings.app_env} mode.",
        },
        {
            "name": "Database",
            "ok": db["ok"],
            "message": db["message"],
        },
        {
            "name": "Upload storage",
            "ok": storage_dir.exists(),
            "message": f"Storage path: {storage_dir.resolve()}",
        },
        {
            "name": "CORS origins",
            "ok": len(settings.cors_origin_list) > 0,
            "message": ", ".join(settings.cors_origin_list),
        },
        {
            "name": "Database mode",
            "ok": not settings.is_production or settings.database_engine_name == "postgresql",
            "message": "SQLite development database" if settings.database_engine_name == "sqlite" else "PostgreSQL/external database configured",
        },
        {
            "name": "Table creation mode",
            "ok": not settings.is_production or not settings.auto_create_tables,
            "message": "Alembic migrations expected" if settings.is_production else "Development auto-create allowed",
        },
    ]
    return {
        "service": settings.app_name,
        "environment": settings.app_env,
        "ready": all(item["ok"] for item in checks),
        "checks": checks,
        "next_steps": [
            "Use PostgreSQL before multi-user production deployment.",
            "Set production CORS origins to the deployed frontend domain only.",
            "Use HTTPS and secure environment variables in production.",
            "Move local file storage to managed object storage before scaling.",
        ],
    }


@router.get("/config-summary")
def config_summary():
    return {
        "app_name": settings.app_name,
        "environment": settings.app_env,
        "database": settings.database_engine_name,
        "auto_create_tables": settings.auto_create_tables,
        "upload_storage_dir": settings.upload_storage_dir,
        "cors_origins": settings.cors_origin_list,
        "docs": "/docs",
        "health": "/health",
        "readiness": "/ops/readiness",
    }



@router.get("/system-check")
def system_check():
    db = _db_status()
    storage_dir = Path("app/storage/uploads")
    return {
        "frontend_expected": ["http://localhost:3000", "http://localhost:3001"],
        "backend_running": True,
        "database_ok": db["ok"],
        "database_message": db["message"],
        "storage_ok": storage_dir.exists(),
        "auth_enabled": True,
        "exports_enabled": True,
        "ai_context_enabled": True,
        "postgres_ready": settings.database_engine_name == "postgresql",
        "local_database_mode": settings.database_engine_name,
        "recommended_next_action": "Use PostgreSQL and real email sending before live multi-user deployment.",
    }


@router.get("/version")
def ops_version():
    return {
        "version": "0.54.2",
        "ops_database_route": "/ops/database",
        "status": "v54 online deployment execution pack loaded",
    }


@router.get("/database")
def database_status():
    db = _db_status()
    table_count = 0
    table_names: list[str] = []
    try:
        inspector = inspect(engine)
        table_names = sorted(inspector.get_table_names())
        table_count = len(table_names)
    except Exception:
        table_names = []
    return {
        "ok": db["ok"],
        "message": db["message"],
        "environment": settings.app_env,
        "database_engine": settings.database_engine_name,
        "auto_create_tables": settings.auto_create_tables,
        "table_count": table_count,
        "tables_preview": table_names[:15],
        "production_ready_database": settings.database_engine_name == "postgresql" and not settings.auto_create_tables,
        "recommended_next_action": (
            "Run Alembic migrations and disable AUTO_CREATE_TABLES for production."
            if settings.auto_create_tables else
            "Database is configured for migration-managed operation."
        ),
    }
