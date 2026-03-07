"""
Storage Service — UPDATED v2

Added: upload_dataset() for CSV/Excel files uploaded in Step 2.
Guidelines upload is now tolerant of None (called only when file is present).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import BinaryIO, Dict, Optional

from app.adapters.storage_adapter import get_storage_adapter


class StorageService:

    ALLOWED_DOC_EXTENSIONS  = {".docx", ".pdf", ".txt"}
    ALLOWED_DATA_EXTENSIONS = {".csv", ".xlsx", ".tsv", ".xls"}
    MAX_FILE_SIZE = 50 * 1024 * 1024   # 50 MB

    def __init__(self):
        self.storage = get_storage_adapter()

    # ── Shared helpers ────────────────────────────────────────────────────────

    def validate_file(
        self,
        filename: str,
        file_size: int,
        allowed_extensions: Optional[set] = None,
        mime_type: Optional[str] = None,
    ) -> Dict:
        errors = []
        ext = Path(filename).suffix.lower()
        allowed = allowed_extensions or self.ALLOWED_DOC_EXTENSIONS

        if ext not in allowed:
            errors.append(
                f"File type '{ext}' not allowed. "
                f"Allowed: {', '.join(sorted(allowed))}"
            )
        if file_size > self.MAX_FILE_SIZE:
            errors.append(
                f"File too large ({file_size / 1024 / 1024:.1f} MB). "
                f"Max: {self.MAX_FILE_SIZE // 1024 // 1024} MB"
            )
        return {"valid": len(errors) == 0, "errors": errors}

    # ── Guidelines ────────────────────────────────────────────────────────────

    async def upload_guidelines(
        self,
        user_id: int,
        file_data: BinaryIO,
        filename: str,
        file_size: int,
    ) -> Dict:
        validation = self.validate_file(filename, file_size)
        if not validation["valid"]:
            return {"success": False, "errors": validation["errors"]}

        timestamp = os.urandom(8).hex()
        safe_name = f"user_{user_id}_guidelines_{timestamp}{Path(filename).suffix}"
        result = self.storage.save_file(file_data, safe_name, folder="guidelines")

        if result["success"]:
            return {"success": True, "path": result["path"], "url": result.get("url", ""), "filename": safe_name}
        return {"success": False, "error": result.get("error", "Upload failed")}

    # ── Past projects ─────────────────────────────────────────────────────────

    async def upload_past_project(
        self,
        user_id: int,
        file_data: BinaryIO,
        filename: str,
        file_size: int,
    ) -> Dict:
        validation = self.validate_file(filename, file_size)
        if not validation["valid"]:
            return {"success": False, "errors": validation["errors"]}

        timestamp = os.urandom(8).hex()
        safe_name = f"user_{user_id}_dump_{timestamp}{Path(filename).suffix}"
        result = self.storage.save_file(file_data, safe_name, folder="past_projects")

        if result["success"]:
            return {"success": True, "path": result["path"], "url": result.get("url", ""), "filename": safe_name}
        return {"success": False, "error": result.get("error", "Upload failed")}

    # ── Dataset (NEW) ─────────────────────────────────────────────────────────

    async def upload_dataset(
        self,
        user_id: int,
        file_data: BinaryIO,
        filename: str,
        file_size: int,
    ) -> Dict:
        """
        Upload a dataset file (CSV, Excel, TSV).
        Stored in the 'datasets' folder with a unique name.
        """
        validation = self.validate_file(
            filename,
            file_size,
            allowed_extensions=self.ALLOWED_DATA_EXTENSIONS,
        )
        if not validation["valid"]:
            return {"success": False, "errors": validation["errors"]}

        timestamp = os.urandom(8).hex()
        safe_name = f"user_{user_id}_dataset_{timestamp}{Path(filename).suffix}"
        result = self.storage.save_file(file_data, safe_name, folder="datasets")

        if result["success"]:
            return {
                "success":  True,
                "path":     result["path"],
                "url":      result.get("url", ""),
                "filename": safe_name,
                "original": filename,
            }
        return {"success": False, "error": result.get("error", "Dataset upload failed")}

    # ── Download / delete / list (unchanged) ─────────────────────────────────

    async def download_file(self, file_path: str) -> Optional[bytes]:
        return self.storage.get_file(file_path)

    async def delete_file(self, file_path: str) -> bool:
        return self.storage.delete_file(file_path)

    async def list_user_files(self, user_id: int, file_type: str = "guidelines") -> list:
        files = self.storage.list_files(file_type)
        user_files = [f for f in files if f.startswith(f"user_{user_id}_")]
        return [
            {"filename": f, "url": self.storage.get_file_url(f"{file_type}/{f}")}
            for f in user_files
        ]

    def get_file_url(self, file_path: str) -> str:
        return self.storage.get_file_url(file_path)
