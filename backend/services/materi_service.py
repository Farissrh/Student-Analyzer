"""
MATERI PEMBELAJARAN SERVICE
=============================
Simpan file materi (modul PDF, soal, video) ke disk lokal server, di folder
uploads/materi/. Metadata-nya (nama asli, subtopik, ukuran) disimpan di DB
lewat model MateriPembelajaran - lihat models.py & crud.py.

KETERBATASAN: penyimpanan file di disk lokal server, BUKAN cloud storage -
cukup buat development/skripsi/demo, tapi kalau nanti deploy ke server
production dengan banyak pengguna, sebaiknya diganti object storage (S3, dsb)
supaya nggak numpuk di 1 mesin & lebih tahan terhadap restart/redeploy server.
"""
import uuid
from pathlib import Path

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "materi"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".mp4"}
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


def validasi_file(filename: str, ukuran_bytes: int) -> str:
    """Return ekstensi kalau valid, raise ValueError kalau tidak."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Tipe file '{ext}' tidak didukung. Yang didukung: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    if ukuran_bytes > MAX_SIZE_BYTES:
        raise ValueError(f"Ukuran file maksimal 100 MB (file ini {ukuran_bytes / 1024 / 1024:.1f} MB)")
    return ext


def simpan_file(content: bytes, filename: str) -> tuple[str, int]:
    """
    Simpan file ke disk dengan nama unik (biar nggak tabrakan antar-upload),
    return (path_lengkap, ukuran_bytes).
    """
    ext = validasi_file(filename, len(content))
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    file_path.write_bytes(content)
    return str(file_path), len(content)


def hapus_file(path_file: str) -> None:
    """Hapus file fisik dari disk - dipanggil bareng crud.hapus_materi()."""
    p = Path(path_file)
    if p.exists():
        p.unlink()
