"""
AI SERVICE - Integrasi Groq API (Llama 3.3-70B)
=================================================
Dipakai untuk 2 fitur:
1. generate_soal_adaptif()  -> soal pilihan ganda untuk Kuis Adaptif
2. generate_learning_path() -> urutan belajar personal untuk Learning Path

CATATAN: modul ini butuh koneksi internet ke api.groq.com + GROQ_API_KEY valid
di .env. Kalau API key salah/kosong atau AI membalas format yang nggak sesuai,
fungsi di sini akan raise RuntimeError dengan pesan jelas - endpoint di main.py
menangkapnya dan balikin HTTP 502 ke client (bukan crash diam-diam).
"""
import os
import json
from typing import List, Optional

from groq import Groq
from pydantic import BaseModel, ValidationError

MODEL = "llama-3.3-70b-versatile"


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY belum diset di file .env")
    return Groq(api_key=api_key)


def _bersihkan_json_fence(raw: str) -> str:
    """LLM kadang bungkus JSON dalam ```json ... ``` walau sudah diminta jangan. Bersihkan itu."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ---------------------- Kuis Adaptif ----------------------

class SoalKuisAI(BaseModel):
    pertanyaan: str
    pilihan: List[str]  # selalu 4 opsi
    jawaban_benar_index: int  # 0-3
    kategori_kesalahan: str  # "Konseptual" | "Prosedural" | "Matematis"


def generate_soal_adaptif(
    subtopik_nama: str,
    tingkat_penguasaan: Optional[str],
    pola_kesalahan_dominan: Optional[str],
    jumlah_soal: int = 5,
) -> List[SoalKuisAI]:
    """
    Generate soal pilihan ganda kimia SMA untuk 1 sub-topik, disesuaikan level siswa
    saat ini (kalau ada datanya - siswa baru yang belum pernah dinilai dapat soal
    level menengah standar).
    """
    client = _get_client()

    konteks_level = {
        "Belum Dikuasai": "Siswa ini masih kesulitan di topik ini. Buat soal yang menguatkan KONSEP DASAR, bahasa sederhana, hindari jebakan rumit.",
        "Sedang Berkembang": "Siswa ini sudah paham dasar tapi masih perlu latihan. Buat soal tingkat menengah yang melatih penerapan konsep.",
        "Sudah Tuntas": "Siswa ini sudah menguasai topik ini. Buat soal yang lebih menantang, aplikatif, atau analitis (HOTS).",
    }.get(tingkat_penguasaan or "", "Buat soal tingkat menengah standar SMA.")

    konteks_pola = ""
    if pola_kesalahan_dominan and pola_kesalahan_dominan not in ("Minimal",):
        konteks_pola = (
            f" Siswa ini cenderung sering salah di aspek {pola_kesalahan_dominan.lower()}, "
            f"jadi sisipkan minimal 1-2 soal yang melatih aspek itu secara spesifik."
        )

    prompt = f"""Kamu adalah guru kimia SMA Indonesia yang membuat soal pilihan ganda.

Buat {jumlah_soal} soal pilihan ganda kimia SMA tentang sub-topik "{subtopik_nama}".
{konteks_level}{konteks_pola}

Untuk SETIAP soal, tentukan juga "kategori_kesalahan" yaitu jenis kesalahan yang
paling mungkin dilakukan siswa KALAU dia salah menjawab soal itu - pilih salah satu:
"Konseptual" (salah paham konsep dasar), "Prosedural" (salah langkah/urutan
pengerjaan), atau "Matematis" (salah hitung/rumus).

WAJIB jawab HANYA dengan JSON array, TANPA teks pembuka/penutup, TANPA markdown
code fence, PERSIS format ini:
[{{"pertanyaan": "...", "pilihan": ["...", "...", "...", "..."], "jawaban_benar_index": 0, "kategori_kesalahan": "Konseptual"}}]

Gunakan Bahasa Indonesia, sesuai kurikulum kimia SMA Indonesia (Kurikulum Merdeka)."""

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=3000,
    )

    raw = _bersihkan_json_fence(completion.choices[0].message.content or "")

    try:
        data = json.loads(raw)
        soal_list = [SoalKuisAI(**item) for item in data]
    except (json.JSONDecodeError, ValidationError, TypeError) as e:
        raise RuntimeError(f"Gagal mem-parsing respons AI jadi soal kuis: {e}\nRespons mentah: {raw[:500]}")

    if len(soal_list) == 0:
        raise RuntimeError("AI mengembalikan 0 soal - coba generate ulang")

    return soal_list


# ---------------------- Learning Path ----------------------

class LangkahLearningPathAI(BaseModel):
    subtopik_nama: str
    alasan: str
    prioritas: int  # urutan, 1 = paling prioritas


def generate_learning_path(
    peta_kompetensi: List[dict],       # [{subtopik_nama, tingkat_penguasaan, pola_kesalahan_dominan, nilai}]
    semua_subtopik_nama: List[str],    # semua sub-topik yang ada, termasuk yang belum dinilai siswa ini
) -> List[LangkahLearningPathAI]:
    """Generate urutan belajar personal berdasarkan peta kompetensi individual siswa."""
    client = _get_client()

    ringkasan = "\n".join(
        f"- {p['subtopik_nama']}: {p['tingkat_penguasaan']} (nilai {p['nilai']}, pola kesalahan dominan {p['pola_kesalahan_dominan']})"
        for p in peta_kompetensi
    ) or "(belum ada data kompetensi sama sekali - siswa baru)"

    dinilai_nama = {p["subtopik_nama"] for p in peta_kompetensi}
    subtopik_belum_dinilai = [s for s in semua_subtopik_nama if s not in dinilai_nama]
    info_belum_dinilai = (
        f"\nSub-topik yang BELUM ada data nilainya sama sekali: {', '.join(subtopik_belum_dinilai)}"
        if subtopik_belum_dinilai else ""
    )

    prompt = f"""Kamu adalah konselor belajar kimia SMA yang menyusun urutan belajar personal untuk siswa.

Data kompetensi siswa saat ini:
{ringkasan}
{info_belum_dinilai}

Susun URUTAN BELAJAR (learning path) untuk SEMUA sub-topik yang disebutkan di atas
(termasuk yang belum ada datanya), dari yang PALING PRIORITAS ke yang paling
belakang. Prioritaskan sub-topik dengan status "Belum Dikuasai" dulu, lalu
"Sedang Berkembang", baru yang belum dinilai atau sudah "Sudah Tuntas" di
urutan akhir (sebagai pengayaan). Kasih alasan singkat & memotivasi untuk tiap
sub-topik, bahasa ramah dan suportif untuk siswa SMA (bukan bahasa teknis guru).

WAJIB jawab HANYA dengan JSON array, TANPA teks pembuka/penutup, TANPA markdown
code fence, PERSIS format ini:
[{{"subtopik_nama": "...", "alasan": "...", "prioritas": 1}}]"""

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_tokens=2000,
    )

    raw = _bersihkan_json_fence(completion.choices[0].message.content or "")

    try:
        data = json.loads(raw)
        langkah_list = [LangkahLearningPathAI(**item) for item in data]
    except (json.JSONDecodeError, ValidationError, TypeError) as e:
        raise RuntimeError(f"Gagal mem-parsing respons AI jadi learning path: {e}\nRespons mentah: {raw[:500]}")

    if len(langkah_list) == 0:
        raise RuntimeError("AI mengembalikan learning path kosong - coba generate ulang")

    langkah_list.sort(key=lambda x: x.prioritas)
    return langkah_list
