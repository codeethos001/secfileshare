import os
import uuid
import asyncio
from app.core.config import settings


class StorageService:
    def __init__(self, base_dir: str = settings.STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_secure_path(self, storage_key: str) -> str:
        clean_key = os.path.basename(storage_key)
        full_path = os.path.abspath(os.path.join(self.base_dir, clean_key))
        if not full_path.startswith(self.base_dir):
            raise ValueError("Invalid storage path")
        return full_path

    def _sync_write(self, file_path: str, data: bytes):
        with open(file_path, "wb") as f:
            f.write(data)

    def _sync_read(self, file_path: str) -> bytes:
        with open(file_path, "rb") as f:
            return f.read()

    async def save_chunk(self, data: bytes) -> tuple[str, int]:
        """Save a raw ciphertext chunk to disk. Never decrypts."""
        storage_key = f"chk_{uuid.uuid4().hex}"
        file_path = self._get_secure_path(storage_key)
        await asyncio.to_thread(self._sync_write, file_path, data)
        return storage_key, len(data)

    async def get_chunk(self, storage_key: str) -> bytes:
        """Read a raw ciphertext chunk from disk."""
        file_path = self._get_secure_path(storage_key)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Chunk {storage_key} not found")
        return await asyncio.to_thread(self._sync_read, file_path)

    def delete_chunk(self, storage_key: str) -> bool:
        """Delete a ciphertext chunk from disk."""
        try:
            file_path = self._get_secure_path(storage_key)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception:
            pass
        return False


storage_service = StorageService()
