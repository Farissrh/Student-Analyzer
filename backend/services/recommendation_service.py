"""
LEARNING MODEL RECOMMENDATION ENGINE
=====================================
Mengagregasi Peta Kompetensi individual SELURUH siswa di satu kelas, untuk SATU
sub-topik, lalu menghasilkan SATU rekomendasi model pembelajaran untuk sub-topik
itu (bukan per siswa) - sesuai revisi dosen pembimbing.

Sumber aturan: Tabel 2.1 BAB II.

| Kondisi Dominan Kelas                          | Pola Kesalahan Dominan        | Rekomendasi Model     |
|-------------------------------------------------|--------------------------------|------------------------|
| Mayoritas Belum Dikuasai (>=50% nilai < 60)      | Konseptual dominan (>50%)      | Discovery Learning     |
| Mayoritas Sedang Berkembang (>=50% nilai 60-74)  | Prosedural dominan (>50%)      | Problem Based Learning |
| Mayoritas Sudah Tuntas (>=50% nilai >= 75)       | Matematis/Campuran atau minimal| Project Based Learning |

CATATAN DESAIN (penting untuk dijelaskan di sidang / BAB IV):
Tabel 2.1 memasangkan "kondisi dominan kelas" dengan "pola kesalahan dominan"
di baris yang sama, tapi di data nyata dua variabel ini tidak selalu berpasangan
persis seperti itu (misal: mayoritas kelas Belum Dikuasai, tapi pola kesalahan
dominannya justru Prosedural, bukan Konseptual).

Keputusan desain engine ini: KONDISI DOMINAN KELAS dipakai sebagai PENENTU UTAMA
rekomendasi (karena itu poros logika di Tabel 2.1 - tiap level penguasaan mayoritas
punya 1 model yang sesuai secara pedagogis). POLA KESALAHAN DOMINAN tetap dihitung
dan disertakan di output sebagai INFORMASI PENDUKUNG/diagnostik, bukan syarat mutlak.
Ini membuat engine tetap bisa memberi rekomendasi untuk kombinasi apapun, tanpa
kehilangan nilai diagnostik pola kesalahan.

Kalau dosen pembimbing ingin logika AND yang lebih ketat (rekomendasi hanya keluar
kalau kondisi DAN pola kesalahan sama-sama cocok dengan satu baris tabel), tinggal
ubah fungsi `rekomendasikan_model()` di bawah - sudah dikomentari di mana titik ubahnya.
"""
from collections import Counter
from typing import List, Optional

from models import TingkatPenguasaan, PolaKesalahan, ModelPembelajaran

# Ambang mayoritas: satu level dianggap "kondisi dominan kelas" kalau
# proporsinya >= ambang ini dari seluruh siswa yang dihitung.
AMBANG_MAYORITAS = 0.5

PEMETAAN_KONDISI_KE_MODEL = {
    TingkatPenguasaan.BELUM_DIKUASAI: ModelPembelajaran.DISCOVERY_LEARNING,
    TingkatPenguasaan.SEDANG_BERKEMBANG: ModelPembelajaran.PROBLEM_BASED_LEARNING,
    TingkatPenguasaan.SUDAH_TUNTAS: ModelPembelajaran.PROJECT_BASED_LEARNING,
}


def hitung_distribusi(tingkat_list: List[TingkatPenguasaan]) -> dict:
    """Hitung persentase siswa di tiap level penguasaan untuk satu sub-topik."""
    total = len(tingkat_list)
    if total == 0:
        return {
            TingkatPenguasaan.BELUM_DIKUASAI: 0.0,
            TingkatPenguasaan.SEDANG_BERKEMBANG: 0.0,
            TingkatPenguasaan.SUDAH_TUNTAS: 0.0,
        }
    hitung = Counter(tingkat_list)
    return {
        level: round(hitung.get(level, 0) / total * 100, 2)
        for level in TingkatPenguasaan
    }


def tentukan_kondisi_dominan(distribusi_persen: dict) -> Optional[TingkatPenguasaan]:
    """
    Menentukan level yang jadi 'kondisi dominan kelas'.
    Return None kalau tidak ada level yang mencapai ambang mayoritas (kelas heterogen).
    """
    kandidat = [
        (level, persen) for level, persen in distribusi_persen.items()
        if persen >= AMBANG_MAYORITAS * 100
    ]
    if not kandidat:
        return None
    # kalau ada >1 yang lolos ambang (jarang terjadi, hanya mungkin persis 50-50 dgn 2 level),
    # ambil yang persentasenya tertinggi
    kandidat.sort(key=lambda kv: kv[1], reverse=True)
    return kandidat[0][0]


def tentukan_pola_kesalahan_dominan_kelas(
    daftar_pola_individual: List[PolaKesalahan],
) -> PolaKesalahan:
    """
    Pola kesalahan dominan di level KELAS = pola yang paling sering muncul sebagai
    pola dominan individual di antara siswa-siswa di kelas itu untuk sub-topik ini.
    """
    if not daftar_pola_individual:
        return PolaKesalahan.MINIMAL
    hitung = Counter(daftar_pola_individual)
    return hitung.most_common(1)[0][0]


def rekomendasikan_model(
    kondisi_dominan: Optional[TingkatPenguasaan],
) -> Optional[ModelPembelajaran]:
    """
    Titik utama pemetaan Tabel 2.1: kondisi dominan kelas -> model pembelajaran.
    Return None kalau kondisi_dominan None (kelas heterogen, tidak ada mayoritas jelas).
    """
    if kondisi_dominan is None:
        return None
    return PEMETAAN_KONDISI_KE_MODEL[kondisi_dominan]


def buat_rekomendasi_kelas(
    hasil_individual: List[dict],
) -> dict:
    """
    Entry point utama Learning Model Recommendation Engine.

    Input: hasil_individual = list of dict, tiap dict hasil dari
           competency_service.petakan_kompetensi() milik satu siswa,
           semua untuk sub-topik yang sama, dalam satu kelas.

    Output: dict siap dipakai untuk response API / disimpan ke tabel RekomendasiModel.
    """
    tingkat_list = [h["tingkat_penguasaan"] for h in hasil_individual]
    pola_list = [h["pola_kesalahan_dominan"] for h in hasil_individual]

    distribusi = hitung_distribusi(tingkat_list)
    kondisi_dominan = tentukan_kondisi_dominan(distribusi)
    pola_dominan_kelas = tentukan_pola_kesalahan_dominan_kelas(pola_list)
    model = rekomendasikan_model(kondisi_dominan)

    catatan = None
    if kondisi_dominan is None:
        catatan = (
            "Kelas heterogen - tidak ada tingkat penguasaan yang mencapai mayoritas "
            f"(ambang {int(AMBANG_MAYORITAS * 100)}%). Disarankan guru meninjau manual "
            "atau menunggu data asesmen tambahan."
        )

    return {
        "jumlah_siswa_dihitung": len(hasil_individual),
        "persen_belum_dikuasai": distribusi[TingkatPenguasaan.BELUM_DIKUASAI],
        "persen_sedang_berkembang": distribusi[TingkatPenguasaan.SEDANG_BERKEMBANG],
        "persen_sudah_tuntas": distribusi[TingkatPenguasaan.SUDAH_TUNTAS],
        "kondisi_dominan": kondisi_dominan.value if kondisi_dominan else None,
        "pola_kesalahan_dominan_kelas": pola_dominan_kelas,
        "model_rekomendasi": model,
        "catatan": catatan,
    }
