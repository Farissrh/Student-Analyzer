"""
PDF NILAI UPLOAD SERVICE
=========================
Ekstrak tabel nilai siswa dari PDF (format: kolom Nama, NIS, Nilai) pakai
pdfplumber. Guru pilih kelas + sub-topik dulu di UI, lalu upload 1 PDF berisi
nilai SATU sub-topik itu untuk seluruh siswa di kelasnya.

KETERBATASAN SAAT INI (penting didokumentasikan di BAB III/IV skripsi):
- PDF harus punya tabel dengan header yang mengandung kata "nama", "nis", dan
  "nilai"/"skor" (case-insensitive, posisi kolom bebas). Format lain berpotensi
  tidak terbaca.
- Rincian pola kesalahan (konseptual/prosedural/matematis) TIDAK ikut diekstrak
  dari tabel nilai standar ini - defaultnya dianggap 0 (pola "Minimal"). Kalau
  butuh ekstraksi pola kesalahan otomatis, itu perlu sumber data lain (misal
  hasil ujian per-butir-soal + analisis AI), di luar cakupan versi ini.
- PDF hasil SCAN (gambar) didukung lewat fallback OCR (Tesseract) - tapi ini
  best-effort, bukan akurat 100%. Lihat _ocr_fallback_extract() di bawah.
"""
import io
import re
from typing import List, Optional

import pdfplumber
from pydantic import BaseModel


class BarisNilaiPDF(BaseModel):
    nama: Optional[str] = None
    nis: str
    nilai: float


class HasilEkstraksiPDF(BaseModel):
    baris: List[BarisNilaiPDF]
    peringatan: List[str]  # baris/tabel yang gagal diparse, dengan alasannya


def _cari_index_kolom(header: List[Optional[str]], kandidat: List[str]) -> Optional[int]:
    """Cari index kolom yang namanya mengandung salah satu kata kunci di `kandidat`."""
    for i, h in enumerate(header):
        if h and any(k in h.lower() for k in kandidat):
            return i
    return None


def ekstrak_tabel_nilai(file_bytes: bytes) -> HasilEkstraksiPDF:
    """
    Entry point utama. Baca semua halaman PDF, cari tabel yang punya kolom
    Nama/NIS/Nilai, kembalikan baris-baris yang berhasil di-parse + daftar
    peringatan untuk baris yang gagal (biar guru tahu apa yang perlu diperbaiki).

    Kalau PDF ternyata hasil SCAN (tidak ada teks/tabel yang bisa diekstrak
    langsung), otomatis coba fallback OCR (lihat _ocr_fallback_extract di bawah).
    """
    baris_hasil: List[BarisNilaiPDF] = []
    peringatan: List[str] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        tabel_valid_ditemukan = False

        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [c.strip() if c else '' for c in table[0]]
                idx_nama = _cari_index_kolom(header, ['nama'])
                idx_nis = _cari_index_kolom(header, ['nis'])
                idx_nilai = _cari_index_kolom(header, ['nilai', 'skor', 'score'])

                if idx_nis is None or idx_nilai is None:
                    continue  # bukan tabel nilai (mungkin tabel lain di halaman itu) - skip diam-diam

                tabel_valid_ditemukan = True

                for row_num, row in enumerate(table[1:], start=2):
                    nis_raw = (row[idx_nis] or '').strip() if idx_nis < len(row) else ''
                    nilai_raw = (row[idx_nilai] or '').strip() if idx_nilai < len(row) else ''
                    nama_raw = (
                        (row[idx_nama] or '').strip()
                        if idx_nama is not None and idx_nama < len(row) else None
                    )

                    if not nis_raw:
                        peringatan.append(f"Halaman {page_num} baris {row_num}: kolom NIS kosong, baris dilewati")
                        continue

                    try:
                        nilai_val = float(nilai_raw.replace(',', '.'))
                    except ValueError:
                        peringatan.append(
                            f"Halaman {page_num} baris {row_num}: nilai '{nilai_raw}' bukan angka, baris dilewati"
                        )
                        continue

                    baris_hasil.append(BarisNilaiPDF(nama=nama_raw or None, nis=nis_raw, nilai=nilai_val))

        if not tabel_valid_ditemukan:
            # Kemungkinan ini PDF hasil scan (gambar, bukan teks) - coba OCR sebagai fallback
            ocr_baris = _ocr_fallback_extract(file_bytes, peringatan)
            baris_hasil.extend(ocr_baris)

    return HasilEkstraksiPDF(baris=baris_hasil, peringatan=peringatan)


def _ocr_fallback_extract(file_bytes: bytes, peringatan: List[str]) -> List[BarisNilaiPDF]:
    """
    Fallback OCR untuk PDF hasil SCAN (gambar, tanpa layer teks) - dicoba otomatis
    kalau ekstraksi tabel teks biasa gagal total. Butuh Tesseract OCR + Poppler
    terinstall di SISTEM (bukan cuma pip install) - kalau nggak ada, fungsi ini
    kasih peringatan jelas dan return kosong (bukan crash).

    PENTING - INI BEST-EFFORT, BUKAN AKURAT 100%:
    Beda dari ekstraksi tabel teks (yang tahu persis posisi kolom), OCR cuma
    baca teks mentah dari gambar lalu dicocokkan pola regex (nama + angka NIS +
    angka nilai per baris). Kalau layout PDF scan-nya rapi & jelas, biasanya
    cukup akurat - tapi HARUS selalu dicek manual hasilnya sebelum dipakai,
    terutama untuk PDF dengan tabel kompleks, kualitas scan buruk, atau tulisan
    tangan (tulisan tangan TIDAK didukung sama sekali oleh Tesseract).
    """
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError:
        peringatan.append(
            "PDF ini sepertinya hasil scan (tidak ada tabel teks yang terbaca), tapi modul OCR "
            "(pytesseract/pdf2image) belum terinstall di server. Install dulu: "
            "pip install pytesseract pdf2image"
        )
        return []

    try:
        images = convert_from_bytes(file_bytes)
    except Exception as e:
        peringatan.append(
            f"PDF ini sepertinya hasil scan, tapi gagal convert ke gambar untuk OCR "
            f"(pastikan Poppler terinstall di sistem - lihat README): {e}"
        )
        return []

    # Pola: nama (huruf+spasi, min 3 karakter) lalu NIS (4-12 digit) lalu nilai (angka, boleh desimal)
    pola_baris = re.compile(r'([A-Za-z][A-Za-z\.\s]{2,}?)\s+(\d{4,12})\s+(\d{1,3}(?:[.,]\d+)?)\s*$')

    hasil: List[BarisNilaiPDF] = []
    for page_num, img in enumerate(images, start=1):
        try:
            text = pytesseract.image_to_string(img, lang='eng')
        except Exception as e:
            peringatan.append(f"OCR gagal diproses di halaman {page_num}: {e}")
            continue

        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            m = pola_baris.match(line)
            if not m:
                continue
            nama_raw, nis_raw, nilai_raw = m.groups()
            try:
                nilai_val = float(nilai_raw.replace(',', '.'))
            except ValueError:
                continue
            hasil.append(BarisNilaiPDF(nama=nama_raw.strip(), nis=nis_raw.strip(), nilai=nilai_val))

    if hasil:
        peringatan.append(
            f"[OCR] {len(hasil)} baris berhasil dibaca dari PDF hasil scan menggunakan OCR. "
            "Akurasi OCR TIDAK sempurna - HARAP VERIFIKASI ulang hasilnya secara manual "
            "sebelum dipakai (cek nilai di Panel Analisis atau Heatmap Kompetensi)."
        )
    else:
        peringatan.append(
            "PDF ini sepertinya hasil scan, sudah dicoba OCR tapi tidak ada baris yang berhasil "
            "dikenali. Coba scan ulang dengan resolusi lebih tinggi & pastikan tabelnya rapi, "
            "atau ketik ulang manual lewat form input nilai."
        )

    return hasil


# ---------------------- Bulk Import Daftar Siswa ----------------------

class BarisSiswaPDF(BaseModel):
    nama: str
    nis: str


class HasilEkstraksiSiswaPDF(BaseModel):
    baris: List[BarisSiswaPDF]
    peringatan: List[str]


def ekstrak_daftar_siswa(file_bytes: bytes) -> HasilEkstraksiSiswaPDF:
    """
    Ekstrak tabel Nama + NIS dari PDF untuk bulk import siswa baru (dipanggil dari
    Manajemen Data > tab Siswa > "Import dari PDF"). Mirip ekstrak_tabel_nilai()
    tapi cuma butuh 2 kolom (Nama, NIS), tanpa Nilai - dan TIDAK ada fallback OCR
    (bulk import siswa biasanya dari data administrasi sekolah yang rapi/digital,
    beda dari nilai ujian yang kadang cuma ada versi hasil scan).
    """
    baris_hasil: List[BarisSiswaPDF] = []
    peringatan: List[str] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        tabel_valid_ditemukan = False

        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [c.strip() if c else '' for c in table[0]]
                idx_nama = _cari_index_kolom(header, ['nama'])
                idx_nis = _cari_index_kolom(header, ['nis'])

                if idx_nama is None or idx_nis is None:
                    continue

                tabel_valid_ditemukan = True

                for row_num, row in enumerate(table[1:], start=2):
                    nama_raw = (row[idx_nama] or '').strip() if idx_nama < len(row) else ''
                    nis_raw = (row[idx_nis] or '').strip() if idx_nis < len(row) else ''

                    if not nama_raw or not nis_raw:
                        peringatan.append(
                            f"Halaman {page_num} baris {row_num}: nama/NIS kosong, baris dilewati"
                        )
                        continue

                    baris_hasil.append(BarisSiswaPDF(nama=nama_raw, nis=nis_raw))

        if not tabel_valid_ditemukan:
            peringatan.append(
                "Tidak ada tabel dengan kolom Nama/NIS yang terdeteksi di PDF ini. "
                "Pastikan PDF punya header tabel yang jelas dengan teks asli (bukan hasil scan)."
            )

    return HasilEkstraksiSiswaPDF(baris=baris_hasil, peringatan=peringatan)
