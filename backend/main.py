"""
Chemistry Student Analyzer - Backend API
Fokus MVP saat ini: Competency Mapping Engine + Learning Model Recommendation Engine.

Jalankan:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Lalu buka http://127.0.0.1:8000/docs untuk coba semua endpoint (Swagger UI).
"""
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import engine, get_db
from services import competency_service, recommendation_service, pdf_service, ai_service, laporan_service, materi_service
from auth import verify_password, create_access_token, require_guru, get_current_user, CurrentUser

# Bikin semua tabel kalau belum ada (untuk dev; kalau nanti perlu migrasi versi, ganti pakai Alembic)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chemistry Student Analyzer API", version="0.1.0")

# CORS dibuka lebar untuk dev (Tauri app akses dari origin lokal) - persempit saat production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------- Autentikasi ----------------------

@app.post("/auth/login/guru", response_model=schemas.TokenOut)
def login_guru(data: schemas.LoginGuruInput, db: Session = Depends(get_db)):
    guru = crud.get_guru_by_username(db, data.username)
    if not guru or not verify_password(data.password, guru.password_hash):
        raise HTTPException(401, "Username atau password salah")
    token = create_access_token(user_id=guru.id, role="guru", nama=guru.nama)
    return schemas.TokenOut(access_token=token, role="guru", user_id=guru.id, nama=guru.nama)


@app.post("/auth/login/siswa", response_model=schemas.TokenOut)
def login_siswa(data: schemas.LoginSiswaInput, db: Session = Depends(get_db)):
    siswa = crud.get_siswa_by_nis(db, data.nis)
    if not siswa or not verify_password(data.password, siswa.password_hash):
        raise HTTPException(401, "NIS atau password salah")
    token = create_access_token(user_id=siswa.id, role="siswa", nama=siswa.nama)
    return schemas.TokenOut(access_token=token, role="siswa", user_id=siswa.id, nama=siswa.nama)


@app.post("/guru", response_model=schemas.GuruOut)
def buat_guru(data: schemas.GuruCreate, db: Session = Depends(get_db)):
    """
    Bikin akun guru baru. CATATAN: endpoint ini sengaja masih dibuka tanpa proteksi
    karena belum ada sistem admin - ini titik awal untuk bikin akun guru pertama kali
    (lewat /docs atau seed script). Kalau nanti sudah ada admin panel, pindahkan
    endpoint ini di belakang otorisasi admin.
    """
    if crud.get_guru_by_username(db, data.username):
        raise HTTPException(400, "Username sudah dipakai")
    return crud.buat_guru(db, data)


# ---------------------- Data master: Kelas, Siswa, SubTopik ----------------------

@app.post("/kelas", response_model=schemas.KelasOut)
def buat_kelas(data: schemas.KelasCreate, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    return crud.buat_kelas(db, data)

@app.get("/kelas", response_model=List[schemas.KelasOut])
def list_kelas(db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    return crud.list_kelas(db)


@app.post("/siswa", response_model=schemas.SiswaOut)
def buat_siswa(data: schemas.SiswaCreate, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    if not crud.get_kelas(db, data.kelas_id):
        raise HTTPException(404, "Kelas tidak ditemukan")
    if crud.get_siswa_by_nis(db, data.nis):
        raise HTTPException(400, f"NIS {data.nis} sudah terdaftar")
    return crud.buat_siswa(db, data)

@app.get("/kelas/{kelas_id}/siswa", response_model=List[schemas.SiswaOut])
def list_siswa_kelas(kelas_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    return crud.list_siswa_by_kelas(db, kelas_id)


DEFAULT_PASSWORD_SISWA_IMPORT = "siswa123"

@app.post("/siswa/upload-pdf", response_model=schemas.UploadSiswaResultOut)
async def upload_siswa_pdf(
    kelas_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_guru),
):
    """
    Bulk import siswa baru dari PDF (tabel kolom Nama, NIS) untuk SATU kelas.
    Semua siswa baru dapat password default yang SAMA (lihat DEFAULT_PASSWORD_SISWA_IMPORT) -
    guru perlu infokan ini ke siswa. Siswa dengan NIS yang sudah terdaftar dilewati
    (dilaporkan sebagai gagal, bukan menimpa data lama).
    """
    kelas = crud.get_kelas(db, kelas_id)
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "File harus berformat PDF")

    file_bytes = await file.read()
    try:
        hasil_ekstraksi = pdf_service.ekstrak_daftar_siswa(file_bytes)
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca PDF: {e}")

    if not hasil_ekstraksi.baris:
        return schemas.UploadSiswaResultOut(
            jumlah_berhasil=0, jumlah_gagal=len(hasil_ekstraksi.peringatan),
            detail_berhasil=[], detail_gagal=hasil_ekstraksi.peringatan,
            password_default=DEFAULT_PASSWORD_SISWA_IMPORT,
        )

    berhasil: List[str] = []
    gagal: List[str] = list(hasil_ekstraksi.peringatan)

    for baris in hasil_ekstraksi.baris:
        if crud.get_siswa_by_nis(db, baris.nis):
            gagal.append(f"NIS {baris.nis} ({baris.nama}) sudah terdaftar, dilewati")
            continue
        crud.buat_siswa(db, schemas.SiswaCreate(
            nama=baris.nama, nis=baris.nis, password=DEFAULT_PASSWORD_SISWA_IMPORT, kelas_id=kelas_id,
        ))
        berhasil.append(f"{baris.nama} (NIS {baris.nis})")

    return schemas.UploadSiswaResultOut(
        jumlah_berhasil=len(berhasil), jumlah_gagal=len(gagal),
        detail_berhasil=berhasil, detail_gagal=gagal,
        password_default=DEFAULT_PASSWORD_SISWA_IMPORT,
    )


@app.post("/subtopik", response_model=schemas.SubTopikOut)
def buat_subtopik(data: schemas.SubTopikCreate, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    return crud.buat_subtopik(db, data)

@app.get("/subtopik", response_model=List[schemas.SubTopikOut])
def list_subtopik(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return crud.list_subtopik(db)


# ---------------------- Asesmen (input nilai + kesalahan) ----------------------

@app.post("/asesmen", response_model=schemas.PetaKompetensiOut)
def input_asesmen(data: schemas.AsesmenInput, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    """
    Catat nilai siswa pada satu sub-topik SEBAGAI RECORD BARU (histori, bukan
    menimpa nilai lama), lalu langsung kembalikan hasil Competency Mapping Engine
    berdasarkan record yang baru saja dibuat ini.
    """
    siswa = db.query(models.Siswa).filter(models.Siswa.id == data.siswa_id).first()
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == data.subtopik_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")

    asesmen = crud.simpan_asesmen(db, data, sumber="manual")
    hasil = competency_service.petakan_kompetensi(asesmen)

    return schemas.PetaKompetensiOut(
        siswa_id=siswa.id,
        siswa_nama=siswa.nama,
        subtopik_id=subtopik.id,
        subtopik_nama=subtopik.nama,
        nilai=hasil["nilai"],
        tingkat_penguasaan=hasil["tingkat_penguasaan"],
        pola_kesalahan_dominan=hasil["pola_kesalahan_dominan"],
        diperbarui_pada=asesmen.diperbarui_pada,
    )


@app.post("/asesmen/upload-pdf", response_model=schemas.UploadPdfResultOut)
async def upload_pdf_nilai(
    kelas_id: int = Form(...),
    subtopik_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_guru),
):
    """
    Upload PDF berisi tabel nilai (kolom Nama, NIS, Nilai) untuk SATU kelas+subtopik.
    Tiap baris yang NIS-nya cocok dengan siswa di kelas ini disimpan sebagai Asesmen
    baru (histori, bukan menimpa). Baris yang gagal (NIS tidak ketemu, nilai bukan
    angka, dst) dilaporkan di response tapi tidak menghentikan baris lainnya.

    Lihat services/pdf_service.py untuk keterbatasan format PDF yang didukung.
    """
    kelas = crud.get_kelas(db, kelas_id)
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == subtopik_id).first()
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "File harus berformat PDF")

    file_bytes = await file.read()
    try:
        hasil_ekstraksi = pdf_service.ekstrak_tabel_nilai(file_bytes)
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca PDF: {e}")

    if not hasil_ekstraksi.baris:
        return schemas.UploadPdfResultOut(
            jumlah_berhasil=0, jumlah_gagal=len(hasil_ekstraksi.peringatan),
            detail_berhasil=[], detail_gagal=hasil_ekstraksi.peringatan,
        )

    berhasil: List[str] = []
    gagal: List[str] = list(hasil_ekstraksi.peringatan)

    siswa_by_nis = {s.nis: s for s in crud.list_siswa_by_kelas(db, kelas_id)}

    for baris in hasil_ekstraksi.baris:
        siswa = siswa_by_nis.get(baris.nis)
        if not siswa:
            gagal.append(f"NIS {baris.nis} ({baris.nama or '-'}) tidak ditemukan di kelas {kelas.nama}")
            continue

        nilai_bulat = max(0, min(100, round(baris.nilai)))
        crud.simpan_asesmen(db, schemas.AsesmenInput(
            siswa_id=siswa.id, subtopik_id=subtopik_id,
            jumlah_soal=100, jumlah_benar=nilai_bulat,
        ), sumber="upload_pdf")
        berhasil.append(f"{siswa.nama} (NIS {siswa.nis}): nilai {nilai_bulat}")

    return schemas.UploadPdfResultOut(
        jumlah_berhasil=len(berhasil), jumlah_gagal=len(gagal),
        detail_berhasil=berhasil, detail_gagal=gagal,
    )


# ---------------------- Kuis Adaptif (Groq AI) ----------------------

@app.post("/kuis/generate", response_model=schemas.SesiKuisOut)
def generate_kuis(
    data: schemas.GenerateKuisInput, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)
):
    """
    Generate soal kuis adaptif via AI, disesuaikan status kompetensi siswa saat ini
    di sub-topik ini (kalau ada). Jawaban benar TIDAK dikirim ke client di sini -
    baru dipakai untuk grading saat siswa submit lewat /kuis/submit.
    """
    if current.role == "siswa" and current.user_id != data.siswa_id:
        raise HTTPException(403, "Kamu cuma bisa generate kuis untuk dirimu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == data.siswa_id).first()
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == data.subtopik_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")

    # Ambil status kompetensi TERKINI siswa di subtopik ini (kalau ada) buat sesuaikan level soal
    asesmen_terkini = crud.get_asesmen_siswa(db, data.siswa_id, data.subtopik_id)
    tingkat = pola = None
    if asesmen_terkini:
        hasil = competency_service.petakan_kompetensi(asesmen_terkini)
        tingkat = hasil["tingkat_penguasaan"].value
        pola = hasil["pola_kesalahan_dominan"].value

    try:
        soal_ai = ai_service.generate_soal_adaptif(subtopik.nama, tingkat, pola, data.jumlah_soal)
    except Exception as e:
        raise HTTPException(502, f"Gagal generate soal dari AI: {e}")

    soal_json = [s.model_dump() for s in soal_ai]
    sesi = crud.simpan_sesi_kuis(db, data.siswa_id, data.subtopik_id, soal_json)

    return schemas.SesiKuisOut(
        sesi_kuis_id=sesi.id,
        subtopik_nama=subtopik.nama,
        soal=[
            schemas.SoalKuisOut(index=i, pertanyaan=s["pertanyaan"], pilihan=s["pilihan"])
            for i, s in enumerate(soal_json)
        ],
    )


@app.post("/kuis/submit", response_model=schemas.HasilKuisOut)
def submit_kuis(
    data: schemas.JawabanKuisInput, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)
):
    """
    Grading jawaban kuis di server (bukan client) - lalu otomatis catat hasilnya
    sebagai Asesmen baru, supaya langsung masuk ke Competency Mapping Engine.
    """
    sesi = crud.get_sesi_kuis(db, data.sesi_kuis_id)
    if not sesi:
        raise HTTPException(404, "Sesi kuis tidak ditemukan")
    if current.role == "siswa" and current.user_id != sesi.siswa_id:
        raise HTTPException(403, "Ini bukan sesi kuis milikmu")
    if sesi.dijawab:
        raise HTTPException(400, "Sesi kuis ini sudah pernah dijawab sebelumnya")

    soal_list = sesi.soal_json
    if len(data.jawaban) != len(soal_list):
        raise HTTPException(400, f"Jumlah jawaban ({len(data.jawaban)}) tidak sama dengan jumlah soal ({len(soal_list)})")

    jumlah_benar = 0
    kesalahan_konseptual = kesalahan_prosedural = kesalahan_matematis = 0
    detail: List[schemas.DetailJawabanOut] = []

    for soal, jawaban_siswa in zip(soal_list, data.jawaban):
        benar = jawaban_siswa == soal["jawaban_benar_index"]
        if benar:
            jumlah_benar += 1
        else:
            kategori = soal.get("kategori_kesalahan", "Konseptual")
            if kategori == "Prosedural":
                kesalahan_prosedural += 1
            elif kategori == "Matematis":
                kesalahan_matematis += 1
            else:
                kesalahan_konseptual += 1

        jawaban_siswa_teks = (
            soal["pilihan"][jawaban_siswa] if 0 <= jawaban_siswa < len(soal["pilihan"]) else "(tidak dijawab)"
        )
        detail.append(schemas.DetailJawabanOut(
            pertanyaan=soal["pertanyaan"],
            jawaban_siswa=jawaban_siswa_teks,
            jawaban_benar=soal["pilihan"][soal["jawaban_benar_index"]],
            benar=benar,
        ))

    asesmen = crud.simpan_asesmen(db, schemas.AsesmenInput(
        siswa_id=sesi.siswa_id, subtopik_id=sesi.subtopik_id,
        jumlah_soal=len(soal_list), jumlah_benar=jumlah_benar,
        kesalahan_konseptual=kesalahan_konseptual,
        kesalahan_prosedural=kesalahan_prosedural,
        kesalahan_matematis=kesalahan_matematis,
    ), sumber="kuis_adaptif")
    crud.tandai_sesi_kuis_dijawab(db, sesi)

    hasil = competency_service.petakan_kompetensi(asesmen)

    return schemas.HasilKuisOut(
        jumlah_soal=len(soal_list), jumlah_benar=jumlah_benar,
        nilai=hasil["nilai"], tingkat_penguasaan=hasil["tingkat_penguasaan"],
        pola_kesalahan_dominan=hasil["pola_kesalahan_dominan"],
        detail_jawaban=detail,
    )


# ---------------------- Learning Path (Groq AI) ----------------------

@app.get("/siswa/{siswa_id}/learning-path", response_model=schemas.LearningPathOut)
def learning_path_siswa(
    siswa_id: int, regenerate: bool = False,
    db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user),
):
    """
    Ambil learning path siswa. Kalau belum pernah di-generate (atau regenerate=True
    diminta eksplisit), generate baru via AI berdasarkan peta kompetensi siswa saat
    ini, lalu simpan (overwrite) ke DB.
    """
    if current.role == "siswa" and current.user_id != siswa_id:
        raise HTTPException(403, "Kamu cuma bisa lihat learning path milikmu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == siswa_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")

    existing = crud.get_learning_path(db, siswa_id)
    if existing and not regenerate:
        return schemas.LearningPathOut(
            siswa_id=siswa_id,
            langkah=[schemas.LangkahLearningPathOut(**l) for l in existing.urutan_json],
            dibuat_pada=existing.dibuat_pada,
        )

    daftar_asesmen = crud.list_asesmen_siswa(db, siswa_id)
    peta = []
    for a in daftar_asesmen:
        h = competency_service.petakan_kompetensi(a)
        peta.append({
            "subtopik_nama": a.subtopik.nama,
            "tingkat_penguasaan": h["tingkat_penguasaan"].value,
            "pola_kesalahan_dominan": h["pola_kesalahan_dominan"].value,
            "nilai": h["nilai"],
        })

    daftar_subtopik = crud.list_subtopik(db)
    semua_subtopik_nama = [s.nama for s in daftar_subtopik]

    try:
        langkah_ai = ai_service.generate_learning_path(peta, semua_subtopik_nama)
    except Exception as e:
        raise HTTPException(502, f"Gagal generate learning path dari AI: {e}")

    subtopik_by_nama = {s.nama: s for s in daftar_subtopik}
    status_by_nama = {p["subtopik_nama"]: p["tingkat_penguasaan"] for p in peta}

    urutan_json = []
    for l in langkah_ai:
        st = subtopik_by_nama.get(l.subtopik_nama)
        urutan_json.append({
            "subtopik_id": st.id if st else None,
            "subtopik_nama": l.subtopik_nama,
            "alasan": l.alasan,
            "prioritas": l.prioritas,
            "status": status_by_nama.get(l.subtopik_nama),
        })

    saved = crud.simpan_learning_path(db, siswa_id, urutan_json)

    return schemas.LearningPathOut(
        siswa_id=siswa_id,
        langkah=[schemas.LangkahLearningPathOut(**l) for l in urutan_json],
        dibuat_pada=saved.dibuat_pada,
    )


# ---------------------- Competency Mapping Engine (individual) ----------------------

@app.get("/siswa/{siswa_id}/peta-kompetensi", response_model=List[schemas.PetaKompetensiOut])
def peta_kompetensi_siswa(siswa_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """
    Peta kompetensi individual siswa, di SEMUA sub-topik yang sudah ada datanya.
    Guru boleh lihat siapa saja; siswa cuma boleh lihat datanya sendiri.
    """
    if current.role == "siswa" and current.user_id != siswa_id:
        raise HTTPException(403, "Kamu cuma bisa melihat peta kompetensi milikmu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == siswa_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")

    daftar_asesmen = crud.list_asesmen_siswa(db, siswa_id)
    hasil = []
    for a in daftar_asesmen:
        h = competency_service.petakan_kompetensi(a)
        hasil.append(schemas.PetaKompetensiOut(
            siswa_id=siswa.id,
            siswa_nama=siswa.nama,
            subtopik_id=a.subtopik.id,
            subtopik_nama=a.subtopik.nama,
            nilai=h["nilai"],
            tingkat_penguasaan=h["tingkat_penguasaan"],
            pola_kesalahan_dominan=h["pola_kesalahan_dominan"],
            diperbarui_pada=a.diperbarui_pada,
        ))
    return hasil


@app.get("/kelas/{kelas_id}/heatmap", response_model=schemas.HeatmapKelasOut)
def heatmap_kelas(kelas_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    """
    Heatmap kompetensi kelas: matriks siswa x sub-topik x tingkat penguasaan.
    Frontend (Figma/React nanti) tinggal render ini jadi grid berwarna.
    """
    kelas = crud.get_kelas(db, kelas_id)
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")

    daftar_siswa = crud.list_siswa_by_kelas(db, kelas_id)
    daftar_subtopik = crud.list_subtopik(db)

    cells = []
    for siswa in daftar_siswa:
        for subtopik in daftar_subtopik:
            asesmen = crud.get_asesmen_siswa(db, siswa.id, subtopik.id)
            if asesmen:
                h = competency_service.petakan_kompetensi(asesmen)
                cells.append(schemas.HeatmapCellOut(
                    siswa_id=siswa.id, siswa_nama=siswa.nama,
                    subtopik_id=subtopik.id, subtopik_nama=subtopik.nama,
                    tingkat_penguasaan=h["tingkat_penguasaan"], nilai=h["nilai"],
                ))
            else:
                # belum ada data - tetap dikirim sebagai sel kosong biar grid tetap utuh
                cells.append(schemas.HeatmapCellOut(
                    siswa_id=siswa.id, siswa_nama=siswa.nama,
                    subtopik_id=subtopik.id, subtopik_nama=subtopik.nama,
                    tingkat_penguasaan=None, nilai=None,
                ))

    return schemas.HeatmapKelasOut(
        kelas_id=kelas.id, kelas_nama=kelas.nama,
        subtopik=daftar_subtopik, siswa=daftar_siswa, cells=cells,
    )


# ---------------------- Learning Model Recommendation Engine ----------------------

@app.get("/kelas/{kelas_id}/subtopik/{subtopik_id}/rekomendasi", response_model=schemas.RekomendasiOut)
def rekomendasi_satu_subtopik(
    kelas_id: int, subtopik_id: int, simpan_histori: bool = True,
    db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru),
):
    """
    Hitung rekomendasi model pembelajaran untuk SATU sub-topik di SATU kelas,
    berdasarkan agregasi peta kompetensi seluruh siswa di kelas itu.
    `simpan_histori=True` (default) akan menyimpan snapshot ke tabel RekomendasiModel.
    """
    kelas = crud.get_kelas(db, kelas_id)
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == subtopik_id).first()
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")

    daftar_asesmen = crud.list_asesmen_kelas_subtopik(db, kelas_id, subtopik_id)
    if not daftar_asesmen:
        raise HTTPException(
            400, "Belum ada data asesmen untuk kombinasi kelas & sub-topik ini"
        )

    hasil_individual = [competency_service.petakan_kompetensi(a) for a in daftar_asesmen]
    hasil_agregasi = recommendation_service.buat_rekomendasi_kelas(hasil_individual)

    if simpan_histori:
        crud.simpan_snapshot_rekomendasi(db, kelas_id, subtopik_id, hasil_agregasi)

    return schemas.RekomendasiOut(
        kelas_id=kelas_id,
        subtopik_id=subtopik_id,
        subtopik_nama=subtopik.nama,
        dihitung_pada=__import__("datetime").datetime.utcnow(),
        **hasil_agregasi,
    )


@app.get("/kelas/{kelas_id}/rekomendasi", response_model=List[schemas.RekomendasiOut])
def rekomendasi_semua_subtopik(kelas_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    """
    Rekomendasi model pembelajaran untuk SEMUA sub-topik yang punya data di kelas ini.
    Ini yang dipakai untuk 'Panel rekomendasi model pembelajaran per sub-topik' di dashboard guru.
    """
    kelas = crud.get_kelas(db, kelas_id)
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")

    daftar_subtopik = crud.list_subtopik(db)
    hasil = []
    for subtopik in daftar_subtopik:
        daftar_asesmen = crud.list_asesmen_kelas_subtopik(db, kelas_id, subtopik.id)
        if not daftar_asesmen:
            continue  # skip sub-topik yang belum ada datanya sama sekali di kelas ini
        hasil_individual = [competency_service.petakan_kompetensi(a) for a in daftar_asesmen]
        hasil_agregasi = recommendation_service.buat_rekomendasi_kelas(hasil_individual)
        hasil.append(schemas.RekomendasiOut(
            kelas_id=kelas_id,
            subtopik_id=subtopik.id,
            subtopik_nama=subtopik.nama,
            dihitung_pada=__import__("datetime").datetime.utcnow(),
            **hasil_agregasi,
        ))
    return hasil


@app.get("/")
def root():
    return {"status": "ok", "message": "Chemistry Student Analyzer API jalan"}


# ---------------------- Histori Nilai (Pantau Progres & Riwayat Nilai) ----------------------

def _agregasi_per_tanggal(daftar_asesmen: List[models.Asesmen]) -> List[schemas.RiwayatNilaiPoin]:
    """Kelompokkan asesmen berdasarkan tanggal (bukan jam-menit), rata-ratakan nilainya per tanggal."""
    from collections import defaultdict
    bucket: dict[str, list[float]] = defaultdict(list)
    for a in daftar_asesmen:
        tanggal = a.diperbarui_pada.date().isoformat()
        bucket[tanggal].append(a.nilai)

    hasil = []
    for tanggal in sorted(bucket.keys()):
        nilai_list = bucket[tanggal]
        hasil.append(schemas.RiwayatNilaiPoin(
            tanggal=tanggal,
            rata_rata_nilai=round(sum(nilai_list) / len(nilai_list), 2),
            jumlah_asesmen=len(nilai_list),
        ))
    return hasil


@app.get("/siswa/{siswa_id}/riwayat", response_model=List[schemas.RiwayatNilaiPoin])
def riwayat_siswa(siswa_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """
    Histori nilai siswa dari waktu ke waktu (dirata-rata lintas sub-topik per tanggal).
    Dipakai tab 'Riwayat Nilai' di Modal Detail Siswa (guru) - guru boleh lihat siapa saja,
    siswa cuma boleh lihat datanya sendiri.
    """
    if current.role == "siswa" and current.user_id != siswa_id:
        raise HTTPException(403, "Kamu cuma bisa melihat riwayat nilai milikmu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == siswa_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")

    return _agregasi_per_tanggal(crud.list_riwayat_siswa(db, siswa_id))


@app.get("/kelas/{kelas_id}/subtopik/{subtopik_id}/riwayat", response_model=List[schemas.RiwayatNilaiPoin])
def riwayat_kelas_subtopik(
    kelas_id: int, subtopik_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)
):
    """
    Histori rata-rata nilai KELAS untuk satu sub-topik dari waktu ke waktu.
    Dipakai untuk grafik utama & mini chart di halaman Pantau Progres.
    """
    kelas = crud.get_kelas(db, kelas_id)
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == subtopik_id).first()
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")

    return _agregasi_per_tanggal(crud.list_riwayat_kelas_subtopik(db, kelas_id, subtopik_id))


# ---------------------- Profil Siswa ----------------------

@app.get("/siswa/{siswa_id}", response_model=schemas.SiswaProfilOut)
def profil_siswa(siswa_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """Info dasar siswa (nama, NIS, kelas) - buat halaman Profil Siswa."""
    if current.role == "siswa" and current.user_id != siswa_id:
        raise HTTPException(403, "Kamu cuma bisa lihat profil milikmu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == siswa_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")

    return schemas.SiswaProfilOut(
        id=siswa.id, nama=siswa.nama, nis=siswa.nis,
        kelas_id=siswa.kelas_id, kelas_nama=siswa.kelas.nama,
    )


@app.get("/siswa/{siswa_id}/ringkasan-belajar", response_model=schemas.RingkasanBelajarOut)
def ringkasan_belajar_siswa(
    siswa_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)
):
    """
    Statistik belajar siswa KHUSUS dari Kuis Adaptif (bukan input manual/PDF guru) -
    buat kartu 'Ringkasan Belajar' di halaman Profil & sebagian kartu Dashboard Siswa.
    """
    if current.role == "siswa" and current.user_id != siswa_id:
        raise HTTPException(403, "Kamu cuma bisa lihat ringkasan belajar milikmu sendiri")

    siswa = db.query(models.Siswa).filter(models.Siswa.id == siswa_id).first()
    if not siswa:
        raise HTTPException(404, "Siswa tidak ditemukan")

    daftar_kuis = crud.list_asesmen_kuis_siswa(db, siswa_id)

    if not daftar_kuis:
        return schemas.RingkasanBelajarOut(
            total_kuis_selesai=0, rata_rata_skor_kuis=None, subtopik_favorit=None, kuis_minggu_ini=0
        )

    rata_rata = round(sum(a.nilai for a in daftar_kuis) / len(daftar_kuis), 2)

    hitung_subtopik: dict[str, int] = {}
    for a in daftar_kuis:
        hitung_subtopik[a.subtopik.nama] = hitung_subtopik.get(a.subtopik.nama, 0) + 1
    subtopik_favorit = max(hitung_subtopik.items(), key=lambda kv: kv[1])[0]

    seminggu_lalu = datetime.utcnow() - timedelta(days=7)
    kuis_minggu_ini = sum(1 for a in daftar_kuis if a.diperbarui_pada >= seminggu_lalu)

    return schemas.RingkasanBelajarOut(
        total_kuis_selesai=len(daftar_kuis),
        rata_rata_skor_kuis=rata_rata,
        subtopik_favorit=subtopik_favorit,
        kuis_minggu_ini=kuis_minggu_ini,
    )


# ---------------------- Export Laporan PDF ----------------------

@app.get("/kelas/{kelas_id}/export-laporan")
def export_laporan_kelas(kelas_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    """
    Generate & download laporan PDF ringkasan kompetensi + rekomendasi model
    pembelajaran untuk 1 kelas. Dipanggil dari tombol 'Export Laporan PDF' di
    Dashboard Guru.
    """
    kelas = crud.get_kelas(db, kelas_id)
    if not kelas:
        raise HTTPException(404, "Kelas tidak ditemukan")

    daftar_siswa_db = crud.list_siswa_by_kelas(db, kelas_id)
    daftar_subtopik = crud.list_subtopik(db)

    siswa_rows = []
    for s in daftar_siswa_db:
        nilai_list = []
        for st in daftar_subtopik:
            a = crud.get_asesmen_siswa(db, s.id, st.id)
            if a:
                nilai_list.append(competency_service.petakan_kompetensi(a)["nilai"])
        if not nilai_list:
            continue
        rata2 = round(sum(nilai_list) / len(nilai_list), 1)
        status = "Sudah Tuntas" if rata2 >= 75 else "Sedang Berkembang" if rata2 >= 60 else "Belum Dikuasai"
        siswa_rows.append({"nama": s.nama, "nis": s.nis, "nilai_rata_rata": rata2, "status": status})

    total_siswa_dinilai = len(siswa_rows)
    rata_rata_kelas = (
        round(sum(s["nilai_rata_rata"] for s in siswa_rows) / total_siswa_dinilai, 1)
        if total_siswa_dinilai else 0
    )

    daftar_rekomendasi = []
    subtopik_kritis = 0
    for st in daftar_subtopik:
        daftar_asesmen = crud.list_asesmen_kelas_subtopik(db, kelas_id, st.id)
        if not daftar_asesmen:
            continue
        hasil_individual = [competency_service.petakan_kompetensi(a) for a in daftar_asesmen]
        hasil = recommendation_service.buat_rekomendasi_kelas(hasil_individual)
        if hasil["kondisi_dominan"] == "Belum Dikuasai":
            subtopik_kritis += 1
        daftar_rekomendasi.append({
            "subtopik_nama": st.nama,
            "model_rekomendasi": hasil["model_rekomendasi"].value if hasil["model_rekomendasi"] else None,
            "persen_tuntas": hasil["persen_sudah_tuntas"],
            "persen_berkembang": hasil["persen_sedang_berkembang"],
            "persen_belum": hasil["persen_belum_dikuasai"],
        })

    pdf_bytes = laporan_service.generate_laporan_kelas_pdf(
        kelas_nama=kelas.nama,
        total_siswa=len(daftar_siswa_db),
        rata_rata_kompetensi=rata_rata_kelas,
        subtopik_kritis_count=subtopik_kritis,
        daftar_siswa=siswa_rows,
        daftar_rekomendasi=daftar_rekomendasi,
    )

    filename = f"Laporan_{kelas.nama.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------- Materi Pembelajaran ----------------------

@app.post("/materi", response_model=schemas.MateriOut)
async def upload_materi(
    subtopik_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_guru),
):
    """Upload file materi pembelajaran (PDF/DOCX/PPTX/MP4) untuk 1 sub-topik."""
    subtopik = db.query(models.SubTopik).filter(models.SubTopik.id == subtopik_id).first()
    if not subtopik:
        raise HTTPException(404, "Sub-topik tidak ditemukan")
    if not file.filename:
        raise HTTPException(400, "Nama file tidak valid")

    content = await file.read()
    try:
        path_file, ukuran_bytes = materi_service.simpan_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))

    obj = crud.buat_materi(db, subtopik_id, file.filename, path_file, ukuran_bytes)

    return schemas.MateriOut(
        id=obj.id, nama_file_asli=obj.nama_file_asli, subtopik_id=obj.subtopik_id,
        subtopik_nama=subtopik.nama, ukuran_bytes=obj.ukuran_bytes, diupload_pada=obj.diupload_pada,
    )


@app.get("/materi", response_model=List[schemas.MateriOut])
def list_materi(
    subtopik_id: Optional[int] = None, db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)
):
    """List semua materi, atau filter per sub-topik lewat query param ?subtopik_id=."""
    daftar = crud.list_materi(db, subtopik_id)
    return [
        schemas.MateriOut(
            id=m.id, nama_file_asli=m.nama_file_asli, subtopik_id=m.subtopik_id,
            subtopik_nama=m.subtopik.nama, ukuran_bytes=m.ukuran_bytes, diupload_pada=m.diupload_pada,
        )
        for m in daftar
    ]


@app.get("/materi/{materi_id}/download")
def download_materi(materi_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    """Download file materi asli."""
    materi = crud.get_materi(db, materi_id)
    if not materi:
        raise HTTPException(404, "Materi tidak ditemukan")
    return FileResponse(materi.path_file, filename=materi.nama_file_asli)


@app.delete("/materi/{materi_id}")
def hapus_materi(materi_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_guru)):
    """Hapus materi (file fisik + record database)."""
    materi = crud.get_materi(db, materi_id)
    if not materi:
        raise HTTPException(404, "Materi tidak ditemukan")
    materi_service.hapus_file(materi.path_file)
    crud.hapus_materi(db, materi)
    return {"status": "ok", "message": f"Materi '{materi.nama_file_asli}' dihapus"}
