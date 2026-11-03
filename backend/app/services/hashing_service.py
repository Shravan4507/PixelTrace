import hashlib
from pathlib import Path
from typing import Tuple

class HashingService:
    CHUNK_SIZE = 64 * 1024  # 64 KB streaming buffer

    @classmethod
    def calculate_hashes(cls, file_path: Path) -> Tuple[str, str, int]:
        """
        Calculates SHA-256 and MD5 hashes in a single streaming pass.
        Returns: (sha256_hex, md5_hex, total_bytes)
        """
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"File not found for hashing: {file_path}")

        sha256_hash = hashlib.sha256()
        md5_hash = hashlib.md5()
        total_bytes = 0

        with open(file_path, "rb") as f:
            while chunk := f.read(cls.CHUNK_SIZE):
                sha256_hash.update(chunk)
                md5_hash.update(chunk)
                total_bytes += len(chunk)

        return sha256_hash.hexdigest(), md5_hash.hexdigest(), total_bytes

    @classmethod
    def calculate_sha256(cls, file_path: Path) -> str:
        sha256, _, _ = cls.calculate_hashes(file_path)
        return sha256

    @classmethod
    def calculate_md5(cls, file_path: Path) -> str:
        _, md5, _ = cls.calculate_hashes(file_path)
        return md5

    @classmethod
    def verify_integrity(cls, file_path: Path, recorded_sha256: str) -> Tuple[bool, str]:
        """
        Recalculates the SHA-256 hash of the stored evidence file.
        Returns (is_intact, current_sha256).
        """
        current_sha256 = cls.calculate_sha256(file_path)
        is_intact = (current_sha256.lower() == recorded_sha256.lower())
        return is_intact, current_sha256

    @classmethod
    def compare_hashes(cls, hash1: str, hash2: str) -> bool:
        return hash1.strip().lower() == hash2.strip().lower()

