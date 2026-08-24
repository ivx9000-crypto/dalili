from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, Project
from app.schemas.core import DatasetCreate, DatasetOut

router = APIRouter(prefix="/datasets", tags=["datasets"])

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "storage" / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".txt", ".json"}


def _safe_filename(filename: str) -> str:
    base = Path(filename).name.replace(" ", "_")
    return "".join(char for char in base if char.isalnum() or char in {"_", "-", "."}) or "dataset_upload"


@router.get("", response_model=list[DatasetOut])
def list_datasets(project_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(Dataset)
    if project_id is not None:
        query = query.filter(Dataset.project_id == project_id)
    return query.order_by(Dataset.created_at.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("", response_model=DatasetOut)
def create_dataset_metadata(payload: DatasetCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    dataset = Dataset(**payload.model_dump())
    db.add(dataset)
    db.flush()
    db.add(AuditLog(action="register", entity_type="dataset", entity_id=str(dataset.id), detail=dataset.filename))
    db.commit()
    db.refresh(dataset)
    return dataset


@router.post("/upload", response_model=DatasetOut)
async def upload_dataset_file(
    project_id: int = Form(...),
    row_count: int = Form(0),
    column_count: int = Form(0),
    quality_score: int | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    original_name = _safe_filename(file.filename or "dataset_upload")
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV, Excel, TXT, or JSON for now.")

    project_dir = UPLOAD_ROOT / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}_{original_name}"
    stored_path = project_dir / stored_name

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    stored_path.write_bytes(content)

    dataset = Dataset(
        project_id=project_id,
        filename=original_name,
        row_count=row_count,
        column_count=column_count,
        quality_score=quality_score,
        storage_path=str(stored_path.relative_to(UPLOAD_ROOT.parent)),
    )
    db.add(dataset)
    db.flush()
    db.add(
        AuditLog(
            action="upload",
            entity_type="dataset",
            entity_id=str(dataset.id),
            detail=f"Stored {original_name} for project #{project_id}",
        )
    )
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}/download")
def download_dataset_file(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.storage_path:
        raise HTTPException(status_code=404, detail="This dataset has metadata only; no backend file is stored.")

    storage_path = UPLOAD_ROOT.parent / dataset.storage_path
    if not storage_path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing on the backend.")

    return FileResponse(path=storage_path, filename=dataset.filename, media_type="application/octet-stream")
