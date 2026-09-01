# Chemistry Student Analyzer — Backend

Backend FastAPI lengkap: auth, Competency Mapping Engine, Learning Model
Recommendation Engine, histori nilai, upload PDF nilai, dan fitur AI (Kuis
Adaptif + Learning Path via Groq).

## Cara Jalankan

```bash
pip install -r requirements.txt
```

Buat file `.env` di folder ini (kalau belum ada) isinya:
```
GROQ_API_KEY=isi_api_key_groq_kamu
JWT_SECRET_KEY=ganti-ini-di-production
```

```bash
python seed_demo.py          # isi data dummy + lihat hasil kedua engine di terminal
uvicorn main:app --reload --port 8000
```

Lalu buka **http://127.0.0.1:8000/docs** — Swagger UI, bisa coba semua endpoint dari browser.

## Autentikasi (JWT)

Semua endpoint data butuh login. Kirim `Authorization: Bearer <token>` di header.

- `POST /auth/login/guru` — body `{ "username": "...", "password": "..." }`
- `POST /auth/login/siswa` — body `{ "nis": "...", "password": "..." }`

Akun demo dari `seed_demo.py`:
- Guru: username `guru1`, password `guru123`
- Siswa: NIS `2026000` s/d `2026009`, password `siswa123` (sama semua, ini cuma demo)

Password di-hash pakai PBKDF2 bawaan Python (`hashlib`, bukan bcrypt) supaya nggak
ada risiko gagal compile di Windows. Token JWT pakai `PyJWT` (pure Python juga).
**Ganti `JWT_SECRET_KEY`** kalau mau deploy sungguhan.

## Endpoint Penting

| Endpoint | Fungsi |
|---|---|
| `POST /auth/login/guru`, `POST /auth/login/siswa` | Login, balikin JWT |
| `POST /asesmen` | Input nilai manual per siswa per sub-topik (jadi record histori baru) |
| `POST /asesmen/upload-pdf` | Upload PDF tabel nilai (Nama/NIS/Nilai) untuk 1 kelas+subtopik sekaligus |
| `GET /siswa/{id}/peta-kompetensi` | Peta kompetensi individual siswa (semua sub-topik, data TERBARU) |
| `GET /siswa/{id}/riwayat` | Histori nilai siswa dari waktu ke waktu (buat grafik) |
| `GET /kelas/{id}/heatmap` | Data heatmap kelas (matriks siswa x sub-topik) |
| `GET /kelas/{id}/subtopik/{id}/riwayat` | Histori nilai kelas untuk 1 sub-topik (buat Pantau Progres) |
| `GET /kelas/{id}/subtopik/{id}/rekomendasi` | Rekomendasi model untuk 1 sub-topik |
| `GET /kelas/{id}/rekomendasi` | Rekomendasi semua sub-topik (panel dashboard guru) |
| `POST /kuis/generate` | Generate soal kuis adaptif via Groq AI |
| `POST /kuis/submit` | Submit & grading jawaban kuis (otomatis jadi Asesmen baru) |
| `GET /siswa/{id}/learning-path` | Ambil/generate learning path personal via Groq AI |

## Fitur AI (Kuis Adaptif & Learning Path)

Butuh `GROQ_API_KEY` valid di `.env`. Model: `llama-3.3-70b-versatile`.

- **Kuis Adaptif**: soal di-generate AI sesuai tingkat penguasaan & pola kesalahan
  siswa saat ini. Jawaban benar TIDAK dikirim ke client saat sesi dibuat (baru
  dipakai server-side untuk grading) - nggak bisa "diintip" dari network tab.
  Hasil kuis otomatis jadi `Asesmen` baru → langsung masuk Competency Mapping Engine.
- **Learning Path**: AI susun urutan belajar dari peta kompetensi siswa, disimpan
  (nggak generate ulang tiap request) - pakai `?regenerate=true` buat paksa ulang.

Detail prompt yang dipakai ada di `services/ai_service.py`.

## Upload PDF Nilai

Format PDF: tabel dengan kolom **Nama, NIS, Nilai** (urutan kolom bebas). Guru
pilih kelas+sub-topik dulu, 1 PDF = nilai 1 sub-topik untuk seluruh siswa di
kelas itu. Keterbatasan: belum support PDF hasil scan (butuh teks asli), dan
nggak ekstrak rincian pola kesalahan (default "Minimal"). Detail di `services/pdf_service.py`.

## Struktur File

```
database.py    → koneksi SQLite + load .env
models.py      → semua tabel (Guru, Kelas, Siswa, SubTopik, Asesmen, RekomendasiModel, SesiKuis, LearningPathSiswa)
schemas.py     → bentuk request/response API (Pydantic)
crud.py        → operasi baca/tulis database
auth.py        → hashing password + JWT
services/
  competency_service.py     → ENGINE 1: tingkat penguasaan + pola kesalahan per siswa
  recommendation_service.py → ENGINE 2: agregasi kelas + mapping ke Tabel 2.1
  pdf_service.py             → ekstraksi tabel nilai dari PDF
  ai_service.py               → integrasi Groq (soal kuis + learning path)
main.py        → semua endpoint FastAPI
seed_demo.py   → data dummy + akun demo + demo kedua engine di terminal
```

## Keputusan Desain Penting (buat sidang nanti)

**Learning Model Recommendation Engine** (`recommendation_service.py`): Tabel 2.1
memasangkan "kondisi dominan kelas" dan "pola kesalahan dominan" di baris yang
sama, tapi di data nyata dua hal ini nggak selalu berpasangan persis. Engine ini
memakai **kondisi dominan kelas sebagai penentu utama**, **pola kesalahan dominan
tetap dihitung & ditampilkan sebagai info pendukung** - biar selalu bisa kasih
rekomendasi untuk kombinasi data apapun. Kalau dospem mau logika AND yang lebih
ketat, tinggal ubah `rekomendasikan_model()`.

**Asesmen sebagai histori** (`models.py`): setiap input nilai (manual, upload PDF,
atau hasil kuis) selalu bikin record BARU, bukan menimpa. Status "saat ini"
selalu ambil record TERBARU. Ini memungkinkan grafik Pantau Progres & Riwayat
Nilai, dengan trade-off: data historis makin lama makin banyak (belum ada
mekanisme arsip/hapus data lama).

**Upload PDF nilai**: rincian pola kesalahan default 0 ("Minimal") karena PDF
nilai standar cuma punya skor akhir, bukan breakdown per jenis kesalahan.

## Yang Masih Bisa Dikembangkan

- Export Laporan PDF (tombol di Dashboard Guru belum ada endpoint backend-nya)
- Upload Materi Pembelajaran (belum ada endpoint sama sekali)
- OCR untuk PDF hasil scan (`pytesseract` sudah di tech stack asli, belum diaktifkan)
- Mekanisme arsip data histori nilai yang sudah lama
