"""
Dataset Profiler
================
Pure Python / pandas. No AI. No network calls.

Reads an uploaded CSV or Excel file and extracts a verified, factual profile
that is injected into LockedRequirements. This eliminates all AI invention
of dataset facts (row counts, column names, dtypes, missing values).

Returns a DatasetProfile dataclass. If profiling fails for any reason, returns
a safe fallback profile so the pipeline never crashes.

Supports: .csv, .tsv, .xlsx, .xls
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class ColumnProfile:
    name: str
    dtype: str                          # "integer", "float", "categorical", "text", "boolean"
    missing_pct: float                  # 0.0 – 100.0
    unique_count: int
    sample_values: List[str]            # Up to 5 representative values
    notes: str = ""                     # e.g. "binary (0/1)", "high cardinality"


@dataclass
class DatasetProfile:
    """Verified facts extracted directly from the uploaded file."""
    # File metadata
    filename: str
    file_size_kb: float

    # Shape
    row_count: int
    column_count: int

    # Column details
    columns: List[ColumnProfile] = field(default_factory=list)

    # Quality summary
    total_missing_pct: float = 0.0      # average across all columns
    duplicate_row_count: int = 0

    # Human-readable summary (injected verbatim into agent prompts)
    summary_for_agents: str = ""

    # Error flag — True if we fell back to defaults
    is_fallback: bool = False
    error_message: str = ""


def profile_dataset(file_path: str) -> DatasetProfile:
    """
    Profile an uploaded dataset file.

    Args:
        file_path: Absolute or relative path to the dataset file.

    Returns:
        DatasetProfile — always returns something, never raises.
    """
    path = Path(file_path)

    if not path.exists():
        return _fallback(file_path, f"File not found: {file_path}")

    ext = path.suffix.lower()
    if ext not in {".csv", ".tsv", ".xlsx", ".xls"}:
        return _fallback(file_path, f"Unsupported file type: {ext}")

    try:
        import pandas as pd
    except ImportError:
        return _fallback(file_path, "pandas not installed")

    try:
        file_size_kb = round(os.path.getsize(file_path) / 1024, 1)

        # ── Load file ──────────────────────────────────────────────────────
        if ext in {".xlsx", ".xls"}:
            df = pd.read_excel(file_path)
        elif ext == ".tsv":
            df = pd.read_csv(file_path, sep="\t")
        else:
            # Try UTF-8 first, then latin-1
            try:
                df = pd.read_csv(file_path, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding="latin-1")

        row_count    = len(df)
        column_count = len(df.columns)

        # ── Duplicate rows ─────────────────────────────────────────────────
        try:
            duplicate_row_count = int(df.duplicated().sum())
        except Exception:
            duplicate_row_count = 0

        # ── Column profiles ────────────────────────────────────────────────
        columns: List[ColumnProfile] = []
        missing_pcts: List[float] = []

        for col in df.columns:
            series   = df[col]
            n_missing = int(series.isna().sum())
            miss_pct  = round(n_missing / row_count * 100, 1) if row_count > 0 else 0.0
            missing_pcts.append(miss_pct)
            unique_n  = int(series.nunique(dropna=True))

            # Determine dtype bucket
            dtype_str = _classify_dtype(series, unique_n, row_count)

            # Sample values (non-null, up to 5)
            sample_vals = _sample_values(series, dtype_str, unique_n)

            # Notes
            notes = _column_notes(dtype_str, unique_n, row_count, miss_pct)

            columns.append(ColumnProfile(
                name=str(col),
                dtype=dtype_str,
                missing_pct=miss_pct,
                unique_count=unique_n,
                sample_values=sample_vals,
                notes=notes,
            ))

        total_missing_pct = round(sum(missing_pcts) / len(missing_pcts), 1) if missing_pcts else 0.0

        # ── Build human-readable summary ───────────────────────────────────
        summary = _build_summary(
            filename=path.name,
            row_count=row_count,
            column_count=column_count,
            columns=columns,
            duplicate_row_count=duplicate_row_count,
            total_missing_pct=total_missing_pct,
        )

        profile = DatasetProfile(
            filename=path.name,
            file_size_kb=file_size_kb,
            row_count=row_count,
            column_count=column_count,
            columns=columns,
            total_missing_pct=total_missing_pct,
            duplicate_row_count=duplicate_row_count,
            summary_for_agents=summary,
            is_fallback=False,
        )

        print(f"   ✅ Dataset profiled: {path.name} — {row_count:,} rows × {column_count} cols")
        return profile

    except Exception as exc:
        return _fallback(file_path, str(exc))


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _classify_dtype(series, unique_count: int, row_count: int) -> str:
    try:
        import pandas as pd
        if pd.api.types.is_bool_dtype(series):
            return "boolean"
        if pd.api.types.is_integer_dtype(series):
            if unique_count == 2:
                return "binary"
            return "integer"
        if pd.api.types.is_float_dtype(series):
            return "float"
        # Object column — heuristic
        if unique_count <= 20 or (row_count > 0 and unique_count / row_count < 0.05):
            return "categorical"
        return "text"
    except Exception:
        return "unknown"


def _sample_values(series, dtype_str: str, unique_count: int) -> List[str]:
    try:
        non_null = series.dropna()
        if dtype_str in {"categorical", "binary", "boolean"}:
            vals = list(non_null.value_counts().index[:5])
        else:
            vals = list(non_null.sample(min(5, len(non_null)), random_state=0))
        return [str(v) for v in vals]
    except Exception:
        return []


def _column_notes(dtype_str: str, unique_count: int, row_count: int, missing_pct: float) -> str:
    notes = []
    if dtype_str == "binary":
        notes.append("binary (2 values)")
    if missing_pct > 20:
        notes.append(f"⚠️ {missing_pct}% missing — imputation required")
    elif missing_pct > 5:
        notes.append(f"{missing_pct}% missing")
    if dtype_str == "text" and unique_count == row_count:
        notes.append("high cardinality — likely ID/name column")
    return "; ".join(notes)


def _build_summary(
    filename: str,
    row_count: int,
    column_count: int,
    columns: List[ColumnProfile],
    duplicate_row_count: int,
    total_missing_pct: float,
) -> str:
    lines = [
        f"UPLOADED DATASET: {filename}",
        f"Shape: {row_count:,} rows × {column_count} columns",
        f"Missing values (avg across columns): {total_missing_pct}%",
        f"Duplicate rows: {duplicate_row_count}",
        "",
        "COLUMN DETAILS:",
    ]

    for col in columns:
        sample_str = ", ".join(col.sample_values[:4]) if col.sample_values else "—"
        line = f"  • {col.name} [{col.dtype}]"
        if col.notes:
            line += f" — {col.notes}"
        line += f" | samples: {sample_str}"
        lines.append(line)

    # Data quality verdict
    lines.append("")
    lines.append("DATA QUALITY NOTES:")
    high_missing = [c for c in columns if c.missing_pct > 20]
    if high_missing:
        lines.append(f"  ⚠️  Columns with >20% missing: {', '.join(c.name for c in high_missing)}")
        lines.append("      → Methodology MUST describe imputation strategy for these columns.")
    else:
        lines.append("  ✅ No columns with >20% missing values.")

    if duplicate_row_count > 0:
        pct = round(duplicate_row_count / row_count * 100, 1)
        lines.append(f"  ⚠️  {duplicate_row_count} duplicate rows ({pct}%) — deduplication step required.")

    binary_cols = [c.name for c in columns if c.dtype == "binary"]
    if binary_cols:
        lines.append(f"  ℹ️  Binary columns (potential target/label): {', '.join(binary_cols)}")

    return "\n".join(lines)


def _fallback(file_path: str, reason: str) -> DatasetProfile:
    filename = Path(file_path).name
    print(f"   ⚠️  Dataset profiling failed ({reason}) — using empty profile")
    return DatasetProfile(
        filename=filename,
        file_size_kb=0.0,
        row_count=0,
        column_count=0,
        columns=[],
        total_missing_pct=0.0,
        duplicate_row_count=0,
        summary_for_agents=(
            f"Dataset file: {filename}\n"
            "Note: Automated profiling was not available for this file. "
            "The student has uploaded a dataset; details should be confirmed "
            "during the data acquisition phase of the project."
        ),
        is_fallback=True,
        error_message=reason,
    )
