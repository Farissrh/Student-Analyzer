"""
COMPETENCY MAPPING ENGINE
=========================
Memetakan capaian kompetensi INDIVIDUAL siswa per sub-topik, ke dalam 3 level
(sesuai BAB II bagian B - Kompetensi dan Pemetaan Kompetensi):

    Sudah Tuntas        : nilai >= 75, pola kesalahan minimal
    Sedang Berkembang   : nilai 60-74, pola kesalahan campuran
    Belum Dikuasai      : nilai < 60, pola kesalahan dominan (satu jenis > 50% dari total salah)

Engine ini murni fungsi (tidak menyentuh DB), supaya gampang di-unit-test dan
gampang dijelaskan di sidang skripsi sebagai "algoritma" yang berdiri sendiri.
"""
from models import TingkatPenguasaan, PolaKesalahan, Asesmen


# Batas nilai (persen) - taruh di satu tempat biar gampang diubah/dituning
BATAS_SUDAH_TUNTAS = 75
BATAS_SEDANG_BERKEMBANG = 60

# Ambang "dominan" untuk pola kesalahan: satu kategori dianggap dominan
# kalau proporsinya > ambang ini dari total kesalahan yang terklasifikasi.
AMBANG_DOMINAN = 0.5


def tentukan_tingkat_penguasaan(nilai: float) -> TingkatPenguasaan:
    """Menentukan level penguasaan murni dari nilai (0-100)."""
    if nilai >= BATAS_SUDAH_TUNTAS:
        return TingkatPenguasaan.SUDAH_TUNTAS
    elif nilai >= BATAS_SEDANG_BERKEMBANG:
        return TingkatPenguasaan.SEDANG_BERKEMBANG
    else:
        return TingkatPenguasaan.BELUM_DIKUASAI


def tentukan_pola_kesalahan_dominan(
    kesalahan_konseptual: int,
    kesalahan_prosedural: int,
    kesalahan_matematis: int,
) -> PolaKesalahan:
    """
    Menentukan pola kesalahan dominan dari rincian jumlah soal salah per kategori.

    - Kalau total kesalahan terklasifikasi = 0        -> MINIMAL
    - Kalau salah satu kategori > 50% dari total salah -> kategori itu (dominan)
    - Selain itu (tidak ada yang > 50%)                -> CAMPURAN
    """
    total = kesalahan_konseptual + kesalahan_prosedural + kesalahan_matematis

    if total == 0:
        return PolaKesalahan.MINIMAL

    proporsi = {
        PolaKesalahan.KONSEPTUAL: kesalahan_konseptual / total,
        PolaKesalahan.PROSEDURAL: kesalahan_prosedural / total,
        PolaKesalahan.MATEMATIS: kesalahan_matematis / total,
    }

    kategori_dominan, nilai_tertinggi = max(proporsi.items(), key=lambda kv: kv[1])

    if nilai_tertinggi > AMBANG_DOMINAN:
        return kategori_dominan
    return PolaKesalahan.CAMPURAN


def petakan_kompetensi(asesmen: Asesmen) -> dict:
    """
    Entry point utama Competency Mapping Engine.
    Input: 1 record Asesmen (nilai + rincian kesalahan).
    Output: dict berisi nilai, tingkat_penguasaan, dan pola_kesalahan_dominan.
    """
    nilai = asesmen.nilai
    tingkat = tentukan_tingkat_penguasaan(nilai)
    pola = tentukan_pola_kesalahan_dominan(
        asesmen.kesalahan_konseptual,
        asesmen.kesalahan_prosedural,
        asesmen.kesalahan_matematis,
    )
    return {
        "nilai": nilai,
        "tingkat_penguasaan": tingkat,
        "pola_kesalahan_dominan": pola,
    }
