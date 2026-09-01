"""
Model database (SQLAlchemy ORM) untuk Chemistry Student Analyzer.

Alur data:
  Kelas 1 --- N Siswa
  SubTopik  (mis. "Stoikiometri", "Termokimia") berdiri sendiri, dipakai lintas kelas
  Asesmen   = 1 nilai ujian/kuis seorang siswa pada satu sub-topik, lengkap dengan
              rincian jenis kesalahan (konseptual/prosedural/matematis) dari jawaban salah.
              Ini adalah SUMBER data untuk Competency Mapping Engine.
  RekomendasiModel = snapshot hasil Learning Model Recommendation Engine untuk satu
              (kelas, sub-topik) pada satu waktu tertentu. Disimpan sebagai histori,
              berguna nanti untuk data BAB IV (hasil uji coba).
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Enum as SAEnum, JSON, Boolean
)
from sqlalchemy.orm import relationship

from database import Base


class TingkatPenguasaan(str, enum.Enum):
    """3 level Competency Mapping Engine (individual, per siswa per sub-topik)."""
    BELUM_DIKUASAI = "Belum Dikuasai"
    SEDANG_BERKEMBANG = "Sedang Berkembang"
    SUDAH_TUNTAS = "Sudah Tuntas"


class PolaKesalahan(str, enum.Enum):
    """Pola kesalahan dominan dari jawaban salah siswa pada satu asesmen."""
    KONSEPTUAL = "Konseptual"
    PROSEDURAL = "Prosedural"
    MATEMATIS = "Matematis"
    CAMPURAN = "Campuran"
    MINIMAL = "Minimal"  # kesalahan sangat sedikit / nyaris tidak ada


class ModelPembelajaran(str, enum.Enum):
    """Output Learning Model Recommendation Engine (per sub-topik, per kelas)."""
    DISCOVERY_LEARNING = "Discovery Learning"
    PROBLEM_BASED_LEARNING = "Problem Based Learning"
    PROJECT_BASED_LEARNING = "Project Based Learning"


class Guru(Base):
    """Akun guru untuk login. Password disimpan ter-hash (lihat auth.py)."""
    __tablename__ = "guru"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nama = Column(String, nullable=False)


class Kelas(Base):
    __tablename__ = "kelas"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String, nullable=False)  # contoh: "XI IPA 1"

    siswa = relationship("Siswa", back_populates="kelas")


class Siswa(Base):
    __tablename__ = "siswa"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String, nullable=False)
    nis = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    kelas_id = Column(Integer, ForeignKey("kelas.id"), nullable=False)

    kelas = relationship("Kelas", back_populates="siswa")
    asesmen = relationship("Asesmen", back_populates="siswa")


class SubTopik(Base):
    __tablename__ = "subtopik"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String, nullable=False)  # contoh: "Stoikiometri"
    bab = Column(String, nullable=True)    # contoh: "Bab 3 - Stoikiometri"


class Asesmen(Base):
    """
    Satu record nilai siswa pada satu sub-topik, PADA SATU WAKTU TERTENTU.
    Beda dari desain awal: sekarang setiap kali guru input nilai, dibuat record BARU
    (bukan upsert/menimpa) - supaya ada histori dari waktu ke waktu untuk grafik
    Pantau Progres & Riwayat Nilai. Status kompetensi "saat ini" (Competency Mapping
    Engine, heatmap, rekomendasi) selalu memakai record TERBARU per (siswa, subtopik) -
    lihat crud.py fungsi-fungsi *_terbaru / yang meng-filter ke asesmen paling baru.
    """
    __tablename__ = "asesmen"

    id = Column(Integer, primary_key=True, index=True)
    siswa_id = Column(Integer, ForeignKey("siswa.id"), nullable=False)
    subtopik_id = Column(Integer, ForeignKey("subtopik.id"), nullable=False)

    jumlah_soal = Column(Integer, nullable=False)
    jumlah_benar = Column(Integer, nullable=False)

    # rincian jumlah SOAL SALAH per kategori jenis kesalahan (bukan persen, biar bisa dihitung ulang)
    kesalahan_konseptual = Column(Integer, default=0)
    kesalahan_prosedural = Column(Integer, default=0)
    kesalahan_matematis = Column(Integer, default=0)

    sumber = Column(String, default="manual")  # "manual" | "upload_pdf" | "kuis_adaptif"
    diperbarui_pada = Column(DateTime, default=datetime.utcnow)  # = tanggal asesmen ini dicatat

    siswa = relationship("Siswa", back_populates="asesmen")
    subtopik = relationship("SubTopik")

    @property
    def nilai(self) -> float:
        """Nilai dalam skala 0-100."""
        if self.jumlah_soal == 0:
            return 0.0
        return round((self.jumlah_benar / self.jumlah_soal) * 100, 2)


class RekomendasiModel(Base):
    """
    Histori hasil Learning Model Recommendation Engine untuk (kelas, sub-topik).
    Disimpan sebagai snapshot tiap kali dihitung ulang - berguna untuk data BAB IV.
    """
    __tablename__ = "rekomendasi_model"

    id = Column(Integer, primary_key=True, index=True)
    kelas_id = Column(Integer, ForeignKey("kelas.id"), nullable=False)
    subtopik_id = Column(Integer, ForeignKey("subtopik.id"), nullable=False)

    model_rekomendasi = Column(SAEnum(ModelPembelajaran), nullable=True)  # null kalau heterogen
    kondisi_dominan = Column(String, nullable=True)  # level dominan yg dipakai sbg dasar
    pola_kesalahan_dominan_kelas = Column(SAEnum(PolaKesalahan), nullable=True)

    persen_belum_dikuasai = Column(Float, nullable=False)
    persen_sedang_berkembang = Column(Float, nullable=False)
    persen_sudah_tuntas = Column(Float, nullable=False)
    jumlah_siswa_dihitung = Column(Integer, nullable=False)

    catatan = Column(String, nullable=True)  # ex: "Kelas heterogen, tidak ada mayoritas >=50%"
    dihitung_pada = Column(DateTime, default=datetime.utcnow)

    kelas = relationship("Kelas")
    subtopik = relationship("SubTopik")


class SesiKuis(Base):
    """
    Satu sesi Kuis Adaptif: soal yang di-generate AI untuk 1 siswa pada 1 sub-topik.
    soal_json menyimpan pertanyaan+pilihan+JAWABAN BENAR (server-side saja, tidak
    dikirim ke client saat sesi dibuat - baru dibongkar setelah siswa submit jawaban,
    lewat endpoint /kuis/submit). Ini mencegah siswa curang lihat jawaban dari network tab.
    """
    __tablename__ = "sesi_kuis"

    id = Column(Integer, primary_key=True, index=True)
    siswa_id = Column(Integer, ForeignKey("siswa.id"), nullable=False)
    subtopik_id = Column(Integer, ForeignKey("subtopik.id"), nullable=False)
    soal_json = Column(JSON, nullable=False)  # list of {pertanyaan, pilihan, jawaban_benar_index, kategori_kesalahan}
    dijawab = Column(Boolean, default=False)
    dibuat_pada = Column(DateTime, default=datetime.utcnow)

    siswa = relationship("Siswa")
    subtopik = relationship("SubTopik")


class LearningPathSiswa(Base):
    """
    Learning path AI untuk 1 siswa - 1 path per siswa, di-generate ulang (overwrite)
    kalau guru/siswa minta refresh. Disimpan di DB (bukan generate on-the-fly tiap
    request) biar hemat panggilan API & konsisten selama sesi belajar siswa.
    """
    __tablename__ = "learning_path"

    id = Column(Integer, primary_key=True, index=True)
    siswa_id = Column(Integer, ForeignKey("siswa.id"), unique=True, nullable=False)
    urutan_json = Column(JSON, nullable=False)  # list of {subtopik_id, subtopik_nama, alasan, prioritas, status}
    dibuat_pada = Column(DateTime, default=datetime.utcnow)

    siswa = relationship("Siswa")


class MateriPembelajaran(Base):
    """
    Metadata file materi pembelajaran (modul, soal, video) per sub-topik.
    File aslinya disimpan di disk (folder uploads/materi/), di sini cuma metadata
    + path-nya - lihat services/materi_service.py.
    """
    __tablename__ = "materi_pembelajaran"

    id = Column(Integer, primary_key=True, index=True)
    subtopik_id = Column(Integer, ForeignKey("subtopik.id"), nullable=False)
    nama_file_asli = Column(String, nullable=False)  # nama file waktu diupload guru
    path_file = Column(String, nullable=False)       # path fisik di disk server
    ukuran_bytes = Column(Integer, nullable=False)
    diupload_pada = Column(DateTime, default=datetime.utcnow)

    subtopik = relationship("SubTopik")
