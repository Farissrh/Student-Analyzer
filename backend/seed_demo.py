"""
Script demo: isi data dummy 1 kelas (10 siswa) x 2 sub-topik, lalu tunjukkan
output Competency Mapping Engine dan Learning Model Recommendation Engine.

Jalankan: python seed_demo.py
(akan membuat/menimpa chemistry_analyzer.db di folder ini)
"""
import os

# Hapus DB lama biar demo selalu mulai bersih
if os.path.exists("chemistry_analyzer.db"):
    os.remove("chemistry_analyzer.db")

from database import SessionLocal, engine
import models
import crud
import schemas
from services import competency_service, recommendation_service

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ---- Akun login demo ----
guru = crud.buat_guru(db, schemas.GuruCreate(username="guru1", password="guru123", nama="Bu Sari Dewi"))
print(f"Akun guru dibuat -> username: guru1, password: guru123")

# ---- Setup: 1 kelas, 10 siswa, 2 sub-topik ----
kelas = crud.buat_kelas(db, schemas.KelasCreate(nama="XI IPA 1"))
stoikiometri = crud.buat_subtopik(db, schemas.SubTopikCreate(nama="Stoikiometri", bab="Bab 3"))
termokimia = crud.buat_subtopik(db, schemas.SubTopikCreate(nama="Termokimia", bab="Bab 5"))

nama_siswa = [
    "Adi", "Bunga", "Citra", "Dewi", "Eka",
    "Fajar", "Gita", "Hana", "Ilham", "Joko",
]
siswa_list = [
    crud.buat_siswa(db, schemas.SiswaCreate(nama=n, nis=f"2026{i:03d}", password="siswa123", kelas_id=kelas.id))
    for i, n in enumerate(nama_siswa)
]
print(f"10 akun siswa dibuat -> NIS: 2026000 s/d 2026009, password: siswa123 (semua sama, demo doang)")

# ---- Skenario Stoikiometri: mayoritas siswa BELUM DIKUASAI, kesalahan konseptual dominan ----
# -> harusnya Learning Model Recommendation Engine merekomendasikan Discovery Learning
data_stoikiometri = [
    # (jumlah_soal, jumlah_benar, salah_konseptual, salah_prosedural, salah_matematis)
    (10, 4, 5, 1, 0),
    (10, 3, 6, 1, 0),
    (10, 5, 4, 1, 0),
    (10, 2, 6, 2, 0),
    (10, 4, 5, 1, 0),
    (10, 6, 3, 1, 0),   # sedang berkembang
    (10, 3, 6, 1, 0),
    (10, 8, 1, 1, 0),   # sudah tuntas
    (10, 4, 5, 1, 0),
    (10, 3, 6, 1, 0),
]

# ---- Skenario Termokimia: mayoritas siswa SUDAH TUNTAS, kesalahan matematis/campuran ----
# -> harusnya Learning Model Recommendation Engine merekomendasikan Project Based Learning
data_termokimia = [
    (10, 8, 0, 1, 1),
    (10, 9, 0, 0, 1),
    (10, 8, 1, 0, 1),
    (10, 7, 1, 1, 1),
    (10, 9, 0, 1, 0),
    (10, 8, 0, 1, 1),
    (10, 6, 1, 1, 2),   # sedang berkembang
    (10, 9, 0, 0, 1),
    (10, 8, 1, 0, 1),
    (10, 5, 2, 1, 2),   # sedang berkembang
]

print("=" * 70)
print("INPUT NILAI + HASIL COMPETENCY MAPPING ENGINE (per siswa, Stoikiometri)")
print("=" * 70)
for siswa, (soal, benar, kk, kp, km) in zip(siswa_list, data_stoikiometri):
    asesmen = crud.simpan_asesmen(db, schemas.AsesmenInput(
        siswa_id=siswa.id, subtopik_id=stoikiometri.id,
        jumlah_soal=soal, jumlah_benar=benar,
        kesalahan_konseptual=kk, kesalahan_prosedural=kp, kesalahan_matematis=km,
    ))
    hasil = competency_service.petakan_kompetensi(asesmen)
    print(f"  {siswa.nama:8s} | nilai={hasil['nilai']:5.1f} | "
          f"{hasil['tingkat_penguasaan'].value:20s} | pola: {hasil['pola_kesalahan_dominan'].value}")

for siswa, (soal, benar, kk, kp, km) in zip(siswa_list, data_termokimia):
    crud.simpan_asesmen(db, schemas.AsesmenInput(
        siswa_id=siswa.id, subtopik_id=termokimia.id,
        jumlah_soal=soal, jumlah_benar=benar,
        kesalahan_konseptual=kk, kesalahan_prosedural=kp, kesalahan_matematis=km,
    ))

print()
print("=" * 70)
print("OUTPUT LEARNING MODEL RECOMMENDATION ENGINE (agregat per kelas)")
print("=" * 70)

for subtopik in [stoikiometri, termokimia]:
    daftar_asesmen = crud.list_asesmen_kelas_subtopik(db, kelas.id, subtopik.id)
    hasil_individual = [competency_service.petakan_kompetensi(a) for a in daftar_asesmen]
    rekom = recommendation_service.buat_rekomendasi_kelas(hasil_individual)

    print(f"\nSub-topik: {subtopik.nama}")
    print(f"  Distribusi -> Belum Dikuasai: {rekom['persen_belum_dikuasai']}% | "
          f"Sedang Berkembang: {rekom['persen_sedang_berkembang']}% | "
          f"Sudah Tuntas: {rekom['persen_sudah_tuntas']}%")
    print(f"  Kondisi dominan kelas       : {rekom['kondisi_dominan']}")
    print(f"  Pola kesalahan dominan kelas: {rekom['pola_kesalahan_dominan_kelas'].value}")
    print(f"  >>> REKOMENDASI MODEL       : "
          f"{rekom['model_rekomendasi'].value if rekom['model_rekomendasi'] else '(tidak ada - kelas heterogen)'}")
    if rekom["catatan"]:
        print(f"  Catatan: {rekom['catatan']}")

db.close()
print("\nSelesai. Database demo tersimpan di chemistry_analyzer.db")
