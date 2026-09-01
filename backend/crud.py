"""Operasi CRUD dasar - jembatan antara endpoint dan database."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

import models
import schemas
from auth import hash_password


# ---------- Guru ----------

def buat_guru(db: Session, data: schemas.GuruCreate) -> models.Guru:
    obj = models.Guru(username=data.username, password_hash=hash_password(data.password), nama=data.nama)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_guru_by_username(db: Session, username: str) -> Optional[models.Guru]:
    return db.query(models.Guru).filter(models.Guru.username == username).first()


# ---------- Kelas ----------

def buat_kelas(db: Session, data: schemas.KelasCreate) -> models.Kelas:
    obj = models.Kelas(nama=data.nama)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_kelas(db: Session, kelas_id: int) -> Optional[models.Kelas]:
    return db.query(models.Kelas).filter(models.Kelas.id == kelas_id).first()

def list_kelas(db: Session) -> List[models.Kelas]:
    return db.query(models.Kelas).all()


# ---------- Siswa ----------

def buat_siswa(db: Session, data: schemas.SiswaCreate) -> models.Siswa:
    obj = models.Siswa(nama=data.nama, nis=data.nis, password_hash=hash_password(data.password), kelas_id=data.kelas_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_siswa_by_kelas(db: Session, kelas_id: int) -> List[models.Siswa]:
    return db.query(models.Siswa).filter(models.Siswa.kelas_id == kelas_id).all()

def get_siswa_by_nis(db: Session, nis: str) -> Optional[models.Siswa]:
    return db.query(models.Siswa).filter(models.Siswa.nis == nis).first()


# ---------- SubTopik ----------

def buat_subtopik(db: Session, data: schemas.SubTopikCreate) -> models.SubTopik:
    obj = models.SubTopik(nama=data.nama, bab=data.bab)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_subtopik(db: Session) -> List[models.SubTopik]:
    return db.query(models.SubTopik).all()


# ---------- Asesmen (SELALU insert baru - lihat docstring model Asesmen) ----------

def simpan_asesmen(db: Session, data: schemas.AsesmenInput, sumber: str = "manual") -> models.Asesmen:
    """
    Setiap panggilan bikin record BARU (histori), bukan menimpa yang lama.
    `sumber` menandai asal data: "manual" (guru input langsung), "upload_pdf",
    atau "kuis_adaptif" - dipakai buat statistik profil siswa (ringkasan belajar).
    """
    obj = models.Asesmen(
        siswa_id=data.siswa_id,
        subtopik_id=data.subtopik_id,
        jumlah_soal=data.jumlah_soal,
        jumlah_benar=data.jumlah_benar,
        kesalahan_konseptual=data.kesalahan_konseptual,
        kesalahan_prosedural=data.kesalahan_prosedural,
        kesalahan_matematis=data.kesalahan_matematis,
        sumber=sumber,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_asesmen_siswa(db: Session, siswa_id: int, subtopik_id: int) -> Optional[models.Asesmen]:
    """Asesmen TERBARU untuk satu siswa+subtopik (dipakai status kompetensi saat ini)."""
    return (
        db.query(models.Asesmen)
        .filter(models.Asesmen.siswa_id == siswa_id, models.Asesmen.subtopik_id == subtopik_id)
        .order_by(models.Asesmen.diperbarui_pada.desc())
        .first()
    )

def list_asesmen_siswa(db: Session, siswa_id: int) -> List[models.Asesmen]:
    """Asesmen TERBARU per sub-topik untuk satu siswa (1 per sub-topik, bukan histori penuh)."""
    semua = (
        db.query(models.Asesmen)
        .filter(models.Asesmen.siswa_id == siswa_id)
        .order_by(models.Asesmen.diperbarui_pada.desc())
        .all()
    )
    terbaru_per_subtopik: dict[int, models.Asesmen] = {}
    for a in semua:
        if a.subtopik_id not in terbaru_per_subtopik:
            terbaru_per_subtopik[a.subtopik_id] = a
    return list(terbaru_per_subtopik.values())

def list_asesmen_kelas_subtopik(db: Session, kelas_id: int, subtopik_id: int) -> List[models.Asesmen]:
    """Asesmen TERBARU per siswa, untuk satu kelas+subtopik (dipakai heatmap & rekomendasi)."""
    semua = (
        db.query(models.Asesmen)
        .join(models.Siswa, models.Asesmen.siswa_id == models.Siswa.id)
        .filter(models.Siswa.kelas_id == kelas_id, models.Asesmen.subtopik_id == subtopik_id)
        .order_by(models.Asesmen.diperbarui_pada.desc())
        .all()
    )
    terbaru_per_siswa: dict[int, models.Asesmen] = {}
    for a in semua:
        if a.siswa_id not in terbaru_per_siswa:
            terbaru_per_siswa[a.siswa_id] = a
    return list(terbaru_per_siswa.values())


# ---------- Histori nilai (SEMUA record, bukan cuma yang terbaru) ----------

def list_riwayat_siswa(db: Session, siswa_id: int) -> List[models.Asesmen]:
    """SEMUA asesmen siswa ini, lintas sub-topik, urut waktu - untuk grafik Riwayat Nilai."""
    return (
        db.query(models.Asesmen)
        .filter(models.Asesmen.siswa_id == siswa_id)
        .order_by(models.Asesmen.diperbarui_pada.asc())
        .all()
    )

def list_riwayat_kelas_subtopik(db: Session, kelas_id: int, subtopik_id: int) -> List[models.Asesmen]:
    """SEMUA asesmen siswa-siswa di kelas ini untuk satu sub-topik, urut waktu - untuk Pantau Progres."""
    return (
        db.query(models.Asesmen)
        .join(models.Siswa, models.Asesmen.siswa_id == models.Siswa.id)
        .filter(models.Siswa.kelas_id == kelas_id, models.Asesmen.subtopik_id == subtopik_id)
        .order_by(models.Asesmen.diperbarui_pada.asc())
        .all()
    )


# ---------- RekomendasiModel (histori snapshot) ----------

def simpan_snapshot_rekomendasi(
    db: Session, kelas_id: int, subtopik_id: int, hasil: dict
) -> models.RekomendasiModel:
    obj = models.RekomendasiModel(
        kelas_id=kelas_id,
        subtopik_id=subtopik_id,
        model_rekomendasi=hasil["model_rekomendasi"],
        kondisi_dominan=hasil["kondisi_dominan"],
        pola_kesalahan_dominan_kelas=hasil["pola_kesalahan_dominan_kelas"],
        persen_belum_dikuasai=hasil["persen_belum_dikuasai"],
        persen_sedang_berkembang=hasil["persen_sedang_berkembang"],
        persen_sudah_tuntas=hasil["persen_sudah_tuntas"],
        jumlah_siswa_dihitung=hasil["jumlah_siswa_dihitung"],
        catatan=hasil["catatan"],
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Sesi Kuis (Kuis Adaptif) ----------

def simpan_sesi_kuis(db: Session, siswa_id: int, subtopik_id: int, soal_json: list) -> models.SesiKuis:
    obj = models.SesiKuis(siswa_id=siswa_id, subtopik_id=subtopik_id, soal_json=soal_json)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_sesi_kuis(db: Session, sesi_id: int) -> Optional[models.SesiKuis]:
    return db.query(models.SesiKuis).filter(models.SesiKuis.id == sesi_id).first()

def tandai_sesi_kuis_dijawab(db: Session, sesi: models.SesiKuis) -> None:
    sesi.dijawab = True
    db.commit()


# ---------- Learning Path ----------

def get_learning_path(db: Session, siswa_id: int) -> Optional[models.LearningPathSiswa]:
    return db.query(models.LearningPathSiswa).filter(models.LearningPathSiswa.siswa_id == siswa_id).first()

def simpan_learning_path(db: Session, siswa_id: int, urutan_json: list) -> models.LearningPathSiswa:
    """Upsert: 1 siswa cuma punya 1 learning path aktif, di-overwrite kalau di-generate ulang."""
    existing = get_learning_path(db, siswa_id)
    if existing:
        existing.urutan_json = urutan_json
        existing.dibuat_pada = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    obj = models.LearningPathSiswa(siswa_id=siswa_id, urutan_json=urutan_json)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Statistik Kuis (Ringkasan Belajar) ----------

def list_asesmen_kuis_siswa(db: Session, siswa_id: int) -> List[models.Asesmen]:
    """Semua asesmen siswa yang sumbernya dari Kuis Adaptif AI - dipakai statistik profil."""
    return (
        db.query(models.Asesmen)
        .filter(models.Asesmen.siswa_id == siswa_id, models.Asesmen.sumber == "kuis_adaptif")
        .order_by(models.Asesmen.diperbarui_pada.desc())
        .all()
    )


# ---------- Materi Pembelajaran ----------

def buat_materi(
    db: Session, subtopik_id: int, nama_file_asli: str, path_file: str, ukuran_bytes: int
) -> models.MateriPembelajaran:
    obj = models.MateriPembelajaran(
        subtopik_id=subtopik_id, nama_file_asli=nama_file_asli,
        path_file=path_file, ukuran_bytes=ukuran_bytes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_materi(db: Session, subtopik_id: Optional[int] = None) -> List[models.MateriPembelajaran]:
    q = db.query(models.MateriPembelajaran)
    if subtopik_id is not None:
        q = q.filter(models.MateriPembelajaran.subtopik_id == subtopik_id)
    return q.order_by(models.MateriPembelajaran.diupload_pada.desc()).all()

def get_materi(db: Session, materi_id: int) -> Optional[models.MateriPembelajaran]:
    return db.query(models.MateriPembelajaran).filter(models.MateriPembelajaran.id == materi_id).first()

def hapus_materi(db: Session, materi: models.MateriPembelajaran) -> None:
    db.delete(materi)
    db.commit()
