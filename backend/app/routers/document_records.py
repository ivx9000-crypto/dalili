from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import AuditLog, Dataset, DocumentRecord, Project
from app.schemas.core import DocumentRecordCreate, DocumentRecordOut

router = APIRouter(prefix="/document-records", tags=["document records"])


@router.get("", response_model=list[DocumentRecordOut])
def list_document_records(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(DocumentRecord)
    if project_id is not None:
        query = query.filter(DocumentRecord.project_id == project_id)
    if dataset_id is not None:
        query = query.filter(DocumentRecord.dataset_id == dataset_id)
    return query.order_by(DocumentRecord.created_at.desc()).all()


@router.get("/latest", response_model=DocumentRecordOut)
def get_latest_document_record(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(DocumentRecord)
    if project_id is not None:
        query = query.filter(DocumentRecord.project_id == project_id)
    record = query.order_by(DocumentRecord.created_at.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="Document record not found")
    return record


@router.get("/{record_id}", response_model=DocumentRecordOut)
def get_document_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(DocumentRecord).filter(DocumentRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Document record not found")
    return record


@router.post("", response_model=DocumentRecordOut)
def create_document_record(payload: DocumentRecordCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.dataset_id is not None:
        dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Dataset does not belong to the selected project")

    record = DocumentRecord(**payload.model_dump())
    db.add(record)
    db.flush()
    db.add(
        AuditLog(
            action="create",
            entity_type="document_record",
            entity_id=str(record.id),
            detail=f"{record.file_name} · {record.word_count} words",
        )
    )
    db.commit()
    db.refresh(record)
    return record
