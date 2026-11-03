import hashlib
import tempfile
from pathlib import Path
import pytest
from backend.app.services.hashing_service import HashingService

def test_hashing_calculation():
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        sample_bytes = b"PixelTrace Forensic Cryptographic Test Stream" * 1024
        tmp.write(sample_bytes)
        tmp_path = Path(tmp.name)

    try:
        expected_sha256 = hashlib.sha256(sample_bytes).hexdigest()
        expected_md5 = hashlib.md5(sample_bytes).hexdigest()

        sha256, md5, total_bytes = HashingService.calculate_hashes(tmp_path)

        assert sha256 == expected_sha256
        assert md5 == expected_md5
        assert total_bytes == len(sample_bytes)
    finally:
        tmp_path.unlink(missing_ok=True)

def test_hash_comparison():
    hash1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    hash2 = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"
    diff_hash = "d41d8cd98f00b204e9800998ecf8427e"

    assert HashingService.compare_hashes(hash1, hash2) is True
    assert HashingService.compare_hashes(hash1, diff_hash) is False

def test_integrity_verification():
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        sample_bytes = b"Original Unaltered Forensic Evidence"
        tmp.write(sample_bytes)
        tmp_path = Path(tmp.name)

    try:
        original_sha = HashingService.calculate_sha256(tmp_path)
        is_intact, current_sha = HashingService.verify_integrity(tmp_path, original_sha)
        assert is_intact is True
        assert current_sha == original_sha

        # Simulate tampering
        with open(tmp_path, "wb") as f:
            f.write(b"Tampered Forensic Evidence")

        is_tampered, tampered_sha = HashingService.verify_integrity(tmp_path, original_sha)
        assert is_tampered is False
        assert tampered_sha != original_sha
    finally:
        tmp_path.unlink(missing_ok=True)

