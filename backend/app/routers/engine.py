import json
import re
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.core import (
    AuditLog,
    Dataset,
    DocumentRecord,
    IndicatorResult,
    MapSummary,
    Project,
    QualityReport,
)

router = APIRouter(prefix="/engine", tags=["backend intelligence engine"])

BACKEND_ROOT = Path(__file__).resolve().parents[2]
STORAGE_ROOT = BACKEND_ROOT / "storage"
UPLOAD_ROOT = STORAGE_ROOT / "uploads"
PROCESSED_ROOT = STORAGE_ROOT / "processed"
DOCUMENT_ROOT = STORAGE_ROOT / "documents"
PROCESSED_ROOT.mkdir(parents=True, exist_ok=True)
DOCUMENT_ROOT.mkdir(parents=True, exist_ok=True)

ConditionOperator = Literal[
    "any",
    "is_not_blank",
    "is_blank",
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "greater_or_equal",
    "less_than",
    "less_or_equal",
]


class IndicatorCalculationRequest(BaseModel):
    project_id: int | None = None
    dataset_id: int
    indicator_name: str
    numerator_column: str
    numerator_operator: ConditionOperator = "equals"
    numerator_value: str | float | int | None = None
    denominator_column: str | None = None
    denominator_operator: ConditionOperator = "any"
    denominator_value: str | float | int | None = None
    target: float | None = None
    disaggregate_by: str | None = None
    save_result: bool = True


class MapSummaryRequest(BaseModel):
    dataset_id: int
    geography_column: str
    project_id: int | None = None
    save_summary: bool = True


def _dataset_storage_path(dataset: Dataset) -> Path:
    if not dataset.storage_path:
        raise HTTPException(status_code=404, detail="Dataset has no stored backend file. Upload the file again from Data Room.")
    path = STORAGE_ROOT / dataset.storage_path
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Stored file is missing: {path}")
    return path


def _clean_column_name(name: Any) -> str:
    text = str(name or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or "unnamed_column"


def _dedupe_columns(columns: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for column in columns:
        base = column
        seen[base] = seen.get(base, 0) + 1
        if seen[base] == 1:
            result.append(base)
        else:
            result.append(f"{base}_{seen[base]}")
    return result


def _read_dataset(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    try:
        if suffix == ".csv":
            df = pd.read_csv(path)
        elif suffix in {".xlsx", ".xls"}:
            df = pd.read_excel(path)
        elif suffix == ".json":
            df = pd.read_json(path)
        elif suffix == ".txt":
            df = pd.read_csv(path, sep=None, engine="python")
        else:
            raise HTTPException(status_code=400, detail="Unsupported dataset file type for backend processing.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read dataset: {exc}") from exc

    df.columns = _dedupe_columns([_clean_column_name(column) for column in df.columns])
    df = df.replace({"": pd.NA, " ": pd.NA, "NA": pd.NA, "N/A": pd.NA, "na": pd.NA, "n/a": pd.NA})
    for column in df.select_dtypes(include=["object"]).columns:
        df[column] = df[column].astype("string").str.strip().replace({"": pd.NA})
    return df


def _column_type(series: pd.Series) -> str:
    non_null = series.dropna()
    if non_null.empty:
        return "Empty"
    if pd.api.types.is_numeric_dtype(non_null):
        return "Number"
    parsed_dates = pd.to_datetime(non_null, errors="coerce")
    if len(non_null) > 0 and parsed_dates.notna().mean() >= 0.8:
        return "Date"
    yes_no = {str(value).strip().lower() for value in non_null.unique()[:20]}
    if yes_no and yes_no.issubset({"yes", "no", "y", "n", "true", "false", "1", "0"}):
        return "Yes/No"
    return "Text"


def _build_quality(df: pd.DataFrame) -> dict[str, Any]:
    row_count = int(len(df))
    column_count = int(len(df.columns))
    duplicate_count = int(df.duplicated().sum()) if row_count else 0
    total_cells = max(row_count * max(column_count, 1), 1)
    missing_cells = int(df.isna().sum().sum())
    missing_rate = missing_cells / total_cells

    missingness = []
    for column in df.columns:
        missing = int(df[column].isna().sum())
        pct = round((missing / row_count * 100), 1) if row_count else 0
        missingness.append({"column": column, "missing": missing, "missing_percent": pct, "type": _column_type(df[column])})
    missingness.sort(key=lambda item: item["missing_percent"], reverse=True)

    issues: list[dict[str, Any]] = []
    if duplicate_count > 0:
        issues.append({"severity": "high", "issue": f"{duplicate_count} duplicate row(s) detected.", "recommendation": "Review duplicates before reporting."})
    empty_columns = [item["column"] for item in missingness if item["missing_percent"] == 100]
    if empty_columns:
        issues.append({"severity": "medium", "issue": f"{len(empty_columns)} empty column(s) detected.", "recommendation": "Remove or confirm why these fields are empty."})
    high_missing = [item for item in missingness if item["missing_percent"] >= 30 and item["missing_percent"] < 100]
    if high_missing:
        issues.append({"severity": "medium", "issue": f"{len(high_missing)} column(s) have 30% or more missing values.", "recommendation": "Interpret findings from these variables with caution."})
    if row_count == 0:
        issues.append({"severity": "high", "issue": "Dataset has no records.", "recommendation": "Upload a dataset with at least one record."})

    score = 100
    score -= min(35, round(missing_rate * 60))
    score -= min(25, duplicate_count * 2)
    score -= min(20, len(empty_columns) * 5)
    score -= min(20, len(high_missing) * 3)
    score = max(0, int(score))

    if score >= 85:
        readiness = "Ready for analysis"
    elif score >= 70:
        readiness = "Usable with caveats"
    elif score >= 50:
        readiness = "Needs cleaning before reporting"
    else:
        readiness = "High-risk data quality"

    summary = (
        f"Dataset has {row_count} record(s), {column_count} column(s), {duplicate_count} duplicate row(s), "
        f"and {missing_cells} missing cell(s). Backend quality score is {score}/100: {readiness}."
    )
    if not issues:
        issues.append({"severity": "low", "issue": "No major quality issue detected by the backend engine.", "recommendation": "Proceed, but still validate indicator definitions."})

    return {
        "row_count": row_count,
        "column_count": column_count,
        "duplicate_count": duplicate_count,
        "missing_cells": missing_cells,
        "missing_rate": round(missing_rate * 100, 2),
        "score": score,
        "readiness_label": readiness,
        "issues": issues,
        "missingness": missingness,
        "summary_text": summary,
    }


def _apply_condition(df: pd.DataFrame, column: str | None, operator: ConditionOperator, value: Any = None) -> pd.Series:
    if operator == "any" or not column:
        return pd.Series([True] * len(df), index=df.index)
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column not found: {column}")
    series = df[column]
    text = series.astype("string").str.lower().fillna("")
    value_text = str(value or "").strip().lower()
    if operator == "is_not_blank":
        return series.notna() & (text.str.strip() != "")
    if operator == "is_blank":
        return series.isna() | (text.str.strip() == "")
    if operator == "equals":
        return text == value_text
    if operator == "not_equals":
        return text != value_text
    if operator == "contains":
        return text.str.contains(re.escape(value_text), na=False)
    if operator == "not_contains":
        return ~text.str.contains(re.escape(value_text), na=False)

    numeric = pd.to_numeric(series, errors="coerce")
    try:
        numeric_value = float(value)  # type: ignore[arg-type]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Numeric comparison requires a numeric value.") from exc
    if operator == "greater_than":
        return numeric > numeric_value
    if operator == "greater_or_equal":
        return numeric >= numeric_value
    if operator == "less_than":
        return numeric < numeric_value
    if operator == "less_or_equal":
        return numeric <= numeric_value
    raise HTTPException(status_code=400, detail=f"Unsupported operator: {operator}")


def _safe_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


@router.get("/datasets/{dataset_id}/profile")
def profile_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = _read_dataset(_dataset_storage_path(dataset))
    quality = _build_quality(df)
    preview = df.head(10).where(pd.notna(df), None).to_dict(orient="records")
    columns = [{"name": column, "type": _column_type(df[column])} for column in df.columns]
    return {
        "dataset_id": dataset.id,
        "file_name": dataset.filename,
        "columns": columns,
        "preview": preview,
        "quality": quality,
    }


@router.post("/datasets/{dataset_id}/quality-report")
def generate_quality_report(dataset_id: int, save_cleaned_file: bool = True, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    path = _dataset_storage_path(dataset)
    df = _read_dataset(path)
    quality = _build_quality(df)

    cleaned_path_text: str | None = None
    if save_cleaned_file:
        project_dir = PROCESSED_ROOT / f"project_{dataset.project_id}"
        project_dir.mkdir(parents=True, exist_ok=True)
        cleaned_name = f"dataset_{dataset.id}_cleaned.csv"
        cleaned_path = project_dir / cleaned_name
        df.to_csv(cleaned_path, index=False)
        cleaned_path_text = str(cleaned_path.relative_to(STORAGE_ROOT))

    report = QualityReport(
        project_id=dataset.project_id,
        dataset_id=dataset.id,
        file_name=dataset.filename,
        row_count=quality["row_count"],
        column_count=quality["column_count"],
        score=quality["score"],
        duplicate_count=quality["duplicate_count"],
        readiness_label=quality["readiness_label"],
        issues_json=_safe_json(quality["issues"]),
        missingness_json=_safe_json(quality["missingness"]),
        summary_text=quality["summary_text"] + (f" Cleaned CSV saved as {cleaned_path_text}." if cleaned_path_text else ""),
    )
    dataset.row_count = quality["row_count"]
    dataset.column_count = quality["column_count"]
    dataset.quality_score = quality["score"]
    db.add(report)
    db.add(AuditLog(action="generate", entity_type="quality_report", entity_id=str(dataset.id), detail="Backend engine generated DQA report"))
    db.commit()
    db.refresh(report)
    return {"report_id": report.id, "cleaned_file": cleaned_path_text, "quality": quality}


@router.post("/indicators/calculate")
def calculate_indicator(payload: IndicatorCalculationRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = _read_dataset(_dataset_storage_path(dataset))
    project_id = payload.project_id or dataset.project_id

    denominator_mask = _apply_condition(df, payload.denominator_column, payload.denominator_operator, payload.denominator_value)
    numerator_mask = _apply_condition(df, payload.numerator_column, payload.numerator_operator, payload.numerator_value) & denominator_mask
    denominator_count = int(denominator_mask.sum())
    numerator_count = int(numerator_mask.sum())
    percentage = round((numerator_count / denominator_count * 100), 2) if denominator_count else 0.0

    groups: list[dict[str, Any]] = []
    if payload.disaggregate_by and payload.disaggregate_by in df.columns:
        for group_value, group_df in df[denominator_mask].groupby(payload.disaggregate_by, dropna=False):
            group_mask = _apply_condition(group_df, payload.numerator_column, payload.numerator_operator, payload.numerator_value)
            group_denominator = int(len(group_df))
            group_numerator = int(group_mask.sum())
            groups.append({
                "group": "Missing" if pd.isna(group_value) else str(group_value),
                "numerator": group_numerator,
                "denominator": group_denominator,
                "percentage": round((group_numerator / group_denominator * 100), 2) if group_denominator else 0,
            })

    numerator_condition = f"{payload.numerator_column} {payload.numerator_operator} {payload.numerator_value}"
    denominator_condition = "All records" if payload.denominator_operator == "any" else f"{payload.denominator_column} {payload.denominator_operator} {payload.denominator_value}"
    calculation_text = f"{numerator_count} / {denominator_count} = {percentage}%"
    result_payload = {
        "project_id": project_id,
        "dataset_id": dataset.id,
        "file_name": dataset.filename,
        "indicator_name": payload.indicator_name,
        "numerator_condition": numerator_condition,
        "denominator_condition": denominator_condition,
        "numerator_count": numerator_count,
        "denominator_count": denominator_count,
        "percentage": percentage,
        "target": payload.target,
        "disaggregate_by": payload.disaggregate_by,
        "groups": groups,
        "calculation_text": calculation_text,
    }

    if payload.save_result:
        indicator = IndicatorResult(
            project_id=project_id,
            dataset_id=dataset.id,
            file_name=dataset.filename,
            indicator_name=payload.indicator_name,
            numerator_condition=numerator_condition,
            denominator_condition=denominator_condition,
            numerator_count=numerator_count,
            denominator_count=denominator_count,
            percentage=percentage,
            target=payload.target,
            disaggregate_by=payload.disaggregate_by,
            groups_json=_safe_json(groups),
            calculation_text=calculation_text,
        )
        db.add(indicator)
        db.flush()
        db.add(AuditLog(action="calculate", entity_type="indicator_result", entity_id=str(indicator.id), detail=payload.indicator_name))
        db.commit()
        db.refresh(indicator)
        result_payload["indicator_result_id"] = indicator.id
    return result_payload


@router.post("/documents/extract")
async def extract_document(
    project_id: int = Form(...),
    dataset_id: int | None = Form(default=None),
    save_record: bool = Form(default=True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    original_name = Path(file.filename or "document_upload").name.replace(" ", "_")
    suffix = Path(original_name).suffix.lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded document is empty")

    project_dir = DOCUMENT_ROOT / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)
    stored_path = project_dir / original_name
    stored_path.write_bytes(content)

    extracted_text = ""
    try:
        if suffix in {".txt", ".md", ".csv", ".json"}:
            extracted_text = content.decode("utf-8", errors="ignore")
        elif suffix == ".docx":
            from docx import Document
            doc = Document(stored_path)
            extracted_text = "\n\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())
        elif suffix == ".pdf":
            from pypdf import PdfReader
            reader = PdfReader(str(stored_path))
            extracted_text = "\n\n".join((page.extract_text() or "") for page in reader.pages)
        else:
            raise HTTPException(status_code=400, detail="Supported document types: PDF, DOCX, TXT, Markdown, CSV, JSON.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not extract document text: {exc}") from exc

    words = re.findall(r"\b\w+\b", extracted_text)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", extracted_text) if p.strip()]
    lowered = extracted_text.lower()
    candidate_themes = [
        "access", "quality", "satisfaction", "equity", "gender", "youth", "health", "hiv", "srh", "mental health",
        "education", "agriculture", "livelihood", "wash", "referral", "barrier", "stigma", "cost", "distance",
    ]
    themes = [theme for theme in candidate_themes if theme in lowered][:10]
    entities = sorted(set(re.findall(r"\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?\b", extracted_text)))[:20]
    summary_text = " ".join(paragraphs[:2])[:1200] if paragraphs else extracted_text[:1200]
    limitations = []
    if not extracted_text.strip():
        limitations.append("No extractable text was found. The document may be scanned or image-based.")
    if suffix == ".pdf":
        limitations.append("PDF extraction quality depends on whether the PDF contains selectable text.")

    response = {
        "file_name": original_name,
        "file_type": suffix.lstrip("."),
        "size_kb": round(len(content) / 1024, 2),
        "character_count": len(extracted_text),
        "word_count": len(words),
        "paragraph_count": len(paragraphs),
        "themes": themes,
        "entities": entities,
        "limitations": limitations,
        "summary_text": summary_text,
        "extracted_text": extracted_text[:20000],
    }
    if save_record:
        record = DocumentRecord(
            project_id=project_id,
            dataset_id=dataset_id,
            file_name=original_name,
            file_type=suffix.lstrip("."),
            size_kb=response["size_kb"],
            character_count=response["character_count"],
            word_count=response["word_count"],
            paragraph_count=response["paragraph_count"],
            themes_json=_safe_json(themes),
            entities_json=_safe_json(entities),
            limitations_json=_safe_json(limitations),
            summary_text=summary_text,
            extracted_text=extracted_text[:20000],
        )
        db.add(record)
        db.flush()
        db.add(AuditLog(action="extract", entity_type="document_record", entity_id=str(record.id), detail=original_name))
        db.commit()
        db.refresh(record)
        response["document_record_id"] = record.id
    return response


@router.post("/maps/summarise")
def summarise_map(payload: MapSummaryRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = _read_dataset(_dataset_storage_path(dataset))
    if payload.geography_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column not found: {payload.geography_column}")
    project_id = payload.project_id or dataset.project_id
    series = df[payload.geography_column].astype("string").str.strip()
    missing_count = int(series.isna().sum() + (series.fillna("") == "").sum())
    counts = series.dropna().loc[series.dropna().astype(str).str.strip() != ""].value_counts().head(100)
    location_counts = [{"location": str(index), "count": int(value)} for index, value in counts.items()]
    unique_locations = int(len(counts))

    known_uganda = {
        "kampala", "wakiso", "mukono", "jinja", "mbale", "mbarara", "gulu", "arua", "lira", "masaka", "fort portal",
        "hoima", "kasese", "kabale", "soroti", "tororo", "busia", "iganga", "kayunga", "mpigi", "buikwe",
    }
    unmapped = [item["location"] for item in location_counts if item["location"].strip().lower() not in known_uganda]
    mapped_locations = unique_locations - len(unmapped)
    map_insight = (
        f"{unique_locations} unique location value(s) were found in {dataset.filename}. "
        f"{missing_count} record(s) have missing location values. "
        f"{len(unmapped)} location value(s) need review against the Uganda geography dictionary."
    )
    response = {
        "project_id": project_id,
        "dataset_id": dataset.id,
        "file_name": dataset.filename,
        "geography_column": payload.geography_column,
        "total_records": int(len(df)),
        "unique_locations": unique_locations,
        "mapped_locations": mapped_locations,
        "unmapped_locations": len(unmapped),
        "missing_location_count": missing_count,
        "quality_score": dataset.quality_score,
        "location_counts": location_counts,
        "unmapped_locations_list": unmapped[:100],
        "map_insight": map_insight,
    }
    if payload.save_summary:
        summary = MapSummary(
            project_id=project_id,
            dataset_id=dataset.id,
            file_name=dataset.filename,
            geography_column=payload.geography_column,
            total_records=response["total_records"],
            unique_locations=unique_locations,
            mapped_locations=mapped_locations,
            unmapped_locations=len(unmapped),
            missing_location_count=missing_count,
            quality_score=dataset.quality_score,
            location_counts_json=_safe_json(location_counts),
            unmapped_locations_json=_safe_json(unmapped[:100]),
            map_insight=map_insight,
        )
        db.add(summary)
        db.flush()
        db.add(AuditLog(action="summarise", entity_type="map_summary", entity_id=str(summary.id), detail=dataset.filename))
        db.commit()
        db.refresh(summary)
        response["map_summary_id"] = summary.id
    return response
