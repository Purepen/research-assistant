"""
Storage Adapter

Purpose: Abstract file storage (S3, local filesystem, etc.)
Why: Can swap storage providers or mock for testing
"""

import os
import shutil
from typing import Optional, BinaryIO, Dict
from pathlib import Path
import mimetypes


class StorageAdapter:
    """
    Adapter for file storage
    Supports local filesystem (default) and S3 (optional)
    """
    
    def __init__(
        self,
        storage_type: str = "local",
        base_path: Optional[str] = None,
        s3_bucket: Optional[str] = None
    ):
        """
        Initialize storage adapter
        
        Args:
            storage_type: "local" or "s3"
            base_path: Base path for local storage
            s3_bucket: S3 bucket name (if using S3)
        """
        self.storage_type = storage_type
        
        if storage_type == "local":
            self.base_path = base_path or os.getenv("STORAGE_PATH", "./storage")
            Path(self.base_path).mkdir(parents=True, exist_ok=True)
        
        elif storage_type == "s3":
            self.s3_bucket = s3_bucket or os.getenv("S3_BUCKET")
            if not self.s3_bucket:
                raise ValueError("S3 bucket not specified")
            
            # Import boto3 only if using S3
            try:
                import boto3
                self.s3_client = boto3.client('s3')
            except ImportError:
                raise ImportError("boto3 required for S3 storage. Install: pip install boto3")
    
    def save_file(
        self,
        file_data: BinaryIO,
        filename: str,
        folder: str = "uploads"
    ) -> Dict[str, any]:
        """
        Save file to storage
        
        Args:
            file_data: Binary file data
            filename: Filename
            folder: Folder/prefix
            
        Returns:
            Result dict with file path/URL
        """
        try:
            if self.storage_type == "local":
                return self._save_local(file_data, filename, folder)
            elif self.storage_type == "s3":
                return self._save_s3(file_data, filename, folder)
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _save_local(
        self,
        file_data: BinaryIO,
        filename: str,
        folder: str
    ) -> Dict[str, any]:
        """Save file to local filesystem"""
        
        folder_path = Path(self.base_path) / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        
        file_path = folder_path / filename
        
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file_data, f)
        
        return {
            "success": True,
            "path": str(file_path),
            "filename": filename,
            "folder": folder,
            "url": f"/files/{folder}/{filename}"  # Relative URL
        }
    
    def _save_s3(
        self,
        file_data: BinaryIO,
        filename: str,
        folder: str
    ) -> Dict[str, any]:
        """Save file to S3"""
        
        key = f"{folder}/{filename}"
        
        # Detect content type
        content_type, _ = mimetypes.guess_type(filename)
        
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        self.s3_client.upload_fileobj(
            file_data,
            self.s3_bucket,
            key,
            ExtraArgs=extra_args
        )
        
        url = f"https://{self.s3_bucket}.s3.amazonaws.com/{key}"
        
        return {
            "success": True,
            "key": key,
            "filename": filename,
            "folder": folder,
            "url": url
        }
    
    def get_file(self, path: str) -> Optional[bytes]:
        """
        Retrieve file from storage
        
        Args:
            path: File path/key
            
        Returns:
            File bytes or None
        """
        try:
            if self.storage_type == "local":
                with open(path, 'rb') as f:
                    return f.read()
            
            elif self.storage_type == "s3":
                response = self.s3_client.get_object(
                    Bucket=self.s3_bucket,
                    Key=path
                )
                return response['Body'].read()
        
        except Exception as e:
            print(f"Error retrieving file: {e}")
            return None
    
    def delete_file(self, path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            path: File path/key
            
        Returns:
            True if successful
        """
        try:
            if self.storage_type == "local":
                if os.path.exists(path):
                    os.remove(path)
                    return True
            
            elif self.storage_type == "s3":
                self.s3_client.delete_object(
                    Bucket=self.s3_bucket,
                    Key=path
                )
                return True
            
            return False
        
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def list_files(self, folder: str = "") -> list:
        """
        List files in folder
        
        Args:
            folder: Folder/prefix
            
        Returns:
            List of filenames
        """
        try:
            if self.storage_type == "local":
                folder_path = Path(self.base_path) / folder
                if folder_path.exists():
                    return [f.name for f in folder_path.iterdir() if f.is_file()]
                return []
            
            elif self.storage_type == "s3":
                response = self.s3_client.list_objects_v2(
                    Bucket=self.s3_bucket,
                    Prefix=folder
                )
                return [obj['Key'] for obj in response.get('Contents', [])]
        
        except Exception as e:
            print(f"Error listing files: {e}")
            return []
    
    def get_file_url(self, path: str) -> str:
        """
        Get public URL for file
        
        Args:
            path: File path/key
            
        Returns:
            Public URL
        """
        if self.storage_type == "local":
            # Assuming files served at /files/ endpoint
            return f"/files/{path}"
        
        elif self.storage_type == "s3":
            return f"https://{self.s3_bucket}.s3.amazonaws.com/{path}"
        
        return ""


# Singleton instance
_storage_adapter: Optional[StorageAdapter] = None


def get_storage_adapter() -> StorageAdapter:
    """Get singleton storage adapter instance"""
    global _storage_adapter
    if _storage_adapter is None:
        storage_type = os.getenv("STORAGE_TYPE", "local")
        _storage_adapter = StorageAdapter(storage_type=storage_type)
    return _storage_adapter
