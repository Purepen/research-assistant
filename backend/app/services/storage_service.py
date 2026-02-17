"""
Storage Service

Purpose: Handle file upload/download operations
Why: Business logic for file management with validation
"""

from typing import Optional, Dict, BinaryIO
from pathlib import Path
import magic
import os

from app.adapters.storage_adapter import get_storage_adapter


class StorageService:
    """
    Service for file storage operations
    Handles uploads, downloads, and validation
    """
    
    # Allowed file types
    ALLOWED_EXTENSIONS = {'.docx', '.pdf', '.txt'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def __init__(self):
        self.storage = get_storage_adapter()
    
    def validate_file(
        self,
        filename: str,
        file_size: int,
        mime_type: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Validate uploaded file
        
        Args:
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type (optional)
            
        Returns:
            Validation result dict
        """
        
        errors = []
        
        # Check extension
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            errors.append(f"File type {ext} not allowed. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}")
        
        # Check size
        if file_size > self.MAX_FILE_SIZE:
            errors.append(f"File too large ({file_size} bytes). Max: {self.MAX_FILE_SIZE} bytes")
        
        # Check MIME type if provided
        if mime_type:
            allowed_mimes = {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
                'application/pdf',
                'text/plain'
            }
            if mime_type not in allowed_mimes:
                errors.append(f"MIME type {mime_type} not allowed")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    async def upload_guidelines(
        self,
        user_id: int,
        file_data: BinaryIO,
        filename: str,
        file_size: int
    ) -> Dict[str, any]:
        """
        Upload guidelines document
        
        Args:
            user_id: User ID
            file_data: Binary file data
            filename: Original filename
            file_size: File size in bytes
            
        Returns:
            Upload result dict
        """
        
        # Validate
        validation = self.validate_file(filename, file_size)
        if not validation["valid"]:
            return {
                "success": False,
                "errors": validation["errors"]
            }
        
        # Generate unique filename
        timestamp = os.urandom(8).hex()
        safe_filename = f"user_{user_id}_guidelines_{timestamp}{Path(filename).suffix}"
        
        # Save to storage
        result = self.storage.save_file(
            file_data=file_data,
            filename=safe_filename,
            folder="guidelines"
        )
        
        if result["success"]:
            return {
                "success": True,
                "path": result["path"],
                "url": result["url"],
                "filename": safe_filename
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Upload failed")
            }
    
    async def upload_past_project(
        self,
        user_id: int,
        file_data: BinaryIO,
        filename: str,
        file_size: int
    ) -> Dict[str, any]:
        """
        Upload past project dump
        
        Args:
            user_id: User ID
            file_data: Binary file data
            filename: Original filename
            file_size: File size in bytes
            
        Returns:
            Upload result dict
        """
        
        # Validate
        validation = self.validate_file(filename, file_size)
        if not validation["valid"]:
            return {
                "success": False,
                "errors": validation["errors"]
            }
        
        # Generate unique filename
        timestamp = os.urandom(8).hex()
        safe_filename = f"user_{user_id}_dump_{timestamp}{Path(filename).suffix}"
        
        # Save to storage
        result = self.storage.save_file(
            file_data=file_data,
            filename=safe_filename,
            folder="past_projects"
        )
        
        if result["success"]:
            return {
                "success": True,
                "path": result["path"],
                "url": result["url"],
                "filename": safe_filename
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Upload failed")
            }
    
    async def download_file(
        self,
        file_path: str
    ) -> Optional[bytes]:
        """
        Download file from storage
        
        Args:
            file_path: File path
            
        Returns:
            File bytes or None
        """
        
        return self.storage.get_file(file_path)
    
    async def delete_file(
        self,
        file_path: str
    ) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: File path
            
        Returns:
            True if successful
        """
        
        return self.storage.delete_file(file_path)
    
    async def list_user_files(
        self,
        user_id: int,
        file_type: str = "guidelines"
    ) -> list:
        """
        List files for a user
        
        Args:
            user_id: User ID
            file_type: Type of files (guidelines, past_projects, results)
            
        Returns:
            List of file info dicts
        """
        
        folder = file_type
        files = self.storage.list_files(folder)
        
        # Filter by user ID
        user_files = [
            f for f in files
            if f.startswith(f"user_{user_id}_")
        ]
        
        return [
            {
                "filename": f,
                "url": self.storage.get_file_url(f"{folder}/{f}")
            }
            for f in user_files
        ]
    
    def get_file_url(self, file_path: str) -> str:
        """
        Get public URL for file
        
        Args:
            file_path: File path
            
        Returns:
            Public URL
        """
        
        return self.storage.get_file_url(file_path)
    
    async def cleanup_old_files(
        self,
        user_id: int,
        days_old: int = 30
    ):
        """
        Clean up files older than specified days
        
        Args:
            user_id: User ID
            days_old: Delete files older than this many days
        """
        
        # Implementation: Query files by timestamp, delete old ones
        # This would need file metadata tracking in database
        pass
