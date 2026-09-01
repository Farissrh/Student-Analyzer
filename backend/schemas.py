"""Pydantic schemas - bentuk data yang masuk/keluar lewat API."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict

from models import TingkatPenguasaan, PolaKesalahan, ModelPembelajaran


# ---------- Kelas & Siswa & SubTopik (data master, sederhana) ----------

class KelasCreate(BaseModel):
    nama: str

class KelasOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str


class SiswaCreate(BaseModel):
    nama: str
    nis: str
    password: str
    kelas_id: int

class SiswaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    nis: str
    kelas_id: int


class GuruCreate(BaseModel):
    username: str
    password: str
    nama: str

class GuruOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    nama: str


class LoginGuruInput(BaseModel):
    username: str
    password: str

class LoginSiswaInput(BaseModel):
    nis: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # 'guru' | 'siswa'
    user_id: int
    nama: str


class SubTopikCreate(BaseModel):
    nama: str
    bab: Optional[str] = None

class SubTopikOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    bab: Optional[str] = None


# ---------- Asesmen (input utama untuk Competency Mapping Engine) ----------

class AsesmenInput(BaseModel):
    """
    Payload untuk mencatat/update nilai siswa pada satu sub-topik.
    kesalahan_* = jumlah SOAL SALAH yang termasuk kategori itu (bukan persen).
    Total kesalahan_konseptual + kesalahan_prosedural + kesalahan_matematis
    boleh <= (jumlah_soal - jumlah_benar); sisanya dianggap "tidak terklasifikasi".
    """
    siswa_id: int
    subtopik_id: int
    jumlah_soal: int
    jumlah_benar: int
    kesalahan_konseptual: int = 0
    kesalahan_prosedural: int = 0
    kesalahan_matematis: int = 0


class PetaKompetensiOut(BaseModel):
    """Output Competency Mapping Engine untuk satu siswa pada satu sub-topik."""
    siswa_id: int
    siswa_nama: str
    subtopik_id: int
    subtopik_nama: str
    nilai: float
    tingkat_penguasaan: TingkatPenguasaan
    pola_kesalahan_dominan: PolaKesalahan
    diperbarui_pada: datetime


# ---------- Rekomendasi Model (output Learning Model Recommendation Engine) ----------

class RekomendasiOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())  # field 'model_rekomendasi' bentrok nama, ini fix-nya

    kelas_id: int
    subtopik_id: int
    subtopik_nama: str
    jumlah_siswa_dihitung: int
    persen_belum_dikuasai: float
    persen_sedang_berkembang: float
    persen_sudah_tuntas: float
    kondisi_dominan: Optional[str] = None
    pola_kesalahan_dominan_kelas: Optional[PolaKesalahan] = None
    model_rekomendasi: Optional[ModelPembelajaran] = None
    catatan: Optional[str] = None
    dihitung_pada: datetime


class HeatmapCellOut(BaseModel):
    siswa_id: int
    siswa_nama: str
    subtopik_id: int
    subtopik_nama: str
    tingkat_penguasaan: Optional[TingkatPenguasaan] = None  # None kalau belum ada data
    nilai: Optional[float] = None


class HeatmapKelasOut(BaseModel):
    kelas_id: int
    kelas_nama: str
    subtopik: List[SubTopikOut]
    siswa: List[SiswaOut]
    cells: List[HeatmapCellOut]


class RiwayatNilaiPoin(BaseModel):
    """Satu titik data untuk grafik histori - nilai dirata-rata per tanggal."""
    tanggal: str  # format YYYY-MM-DD
    rata_rata_nilai: float
    jumlah_asesmen: int


class UploadPdfResultOut(BaseModel):
    """Ringkasan hasil upload PDF nilai - berapa baris berhasil/gagal + detailnya."""
    jumlah_berhasil: int
    jumlah_gagal: int
    detail_berhasil: List[str]
    detail_gagal: List[str]


# ---------- Kuis Adaptif ----------

class GenerateKuisInput(BaseModel):
    siswa_id: int
    subtopik_id: int
    jumlah_soal: int = 5

class SoalKuisOut(BaseModel):
    """Soal yang dikirim ke client - SENGAJA tanpa jawaban_benar_index (rahasia di server)."""
    index: int
    pertanyaan: str
    pilihan: List[str]

class SesiKuisOut(BaseModel):
    sesi_kuis_id: int
    subtopik_nama: str
    soal: List[SoalKuisOut]

class JawabanKuisInput(BaseModel):
    sesi_kuis_id: int
    jawaban: List[int]  # index pilihan yang dipilih siswa, urutan sesuai soal

class DetailJawabanOut(BaseModel):
    pertanyaan: str
    jawaban_siswa: str
    jawaban_benar: str
    benar: bool

class HasilKuisOut(BaseModel):
    jumlah_soal: int
    jumlah_benar: int
    nilai: float
    tingkat_penguasaan: TingkatPenguasaan
    pola_kesalahan_dominan: PolaKesalahan
    detail_jawaban: List[DetailJawabanOut]


# ---------- Learning Path ----------

class LangkahLearningPathOut(BaseModel):
    subtopik_id: Optional[int] = None
    subtopik_nama: str
    alasan: str
    prioritas: int
    status: Optional[str] = None  # tingkat penguasaan saat ini kalau ada datanya

class LearningPathOut(BaseModel):
    siswa_id: int
    langkah: List[LangkahLearningPathOut]
    dibuat_pada: datetime


# ---------- Profil Siswa ----------

class SiswaProfilOut(BaseModel):
    id: int
    nama: str
    nis: str
    kelas_id: int
    kelas_nama: str

class RingkasanBelajarOut(BaseModel):
    total_kuis_selesai: int
    rata_rata_skor_kuis: Optional[float] = None
    subtopik_favorit: Optional[str] = None
    kuis_minggu_ini: int


# ---------- Materi Pembelajaran ----------

class MateriOut(BaseModel):
    id: int
    nama_file_asli: str
    subtopik_id: int
    subtopik_nama: str
    ukuran_bytes: int
    diupload_pada: datetime


# ---------- Bulk Import Siswa ----------

class UploadSiswaResultOut(BaseModel):
    jumlah_berhasil: int
    jumlah_gagal: int
    detail_berhasil: List[str]
    detail_gagal: List[str]
    password_default: str  # dikirim balik biar guru tau password awal buat diinfokan ke siswa
