"""
LAPORAN PDF SERVICE
=====================
Generate laporan PDF ringkasan kompetensi + rekomendasi model pembelajaran
untuk 1 kelas - dipakai tombol "Export Laporan PDF" di Dashboard Guru.
Pakai reportlab (sama seperti buat PDF contoh waktu development).
"""
import io
from datetime import datetime
from typing import List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer


def generate_laporan_kelas_pdf(
    kelas_nama: str,
    total_siswa: int,
    rata_rata_kompetensi: float,
    subtopik_kritis_count: int,
    daftar_siswa: List[dict],        # [{nama, nis, nilai_rata_rata, status}]
    daftar_rekomendasi: List[dict],  # [{subtopik_nama, model_rekomendasi, persen_tuntas, persen_berkembang, persen_belum, catatan}]
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm,
                             leftMargin=2 * cm, rightMargin=2 * cm)
    styles = getSampleStyleSheet()

    judul_style = ParagraphStyle('JudulLaporan', parent=styles['Title'], fontSize=18,
                                  textColor=colors.HexColor('#1E3A8A'), spaceAfter=4)
    subjudul_style = ParagraphStyle('SubJudul', parent=styles['Heading2'], fontSize=13,
                                     textColor=colors.HexColor('#1E3A8A'), spaceBefore=18, spaceAfter=8)
    kecil_muted_style = ParagraphStyle('KecilMuted', parent=styles['Normal'], fontSize=9,
                                        textColor=colors.HexColor('#64748B'))

    story = []
    story.append(Paragraph("Laporan Kompetensi Kelas", judul_style))
    story.append(Paragraph(f"Kelas: <b>{kelas_nama}</b>", styles['Normal']))
    story.append(Paragraph(f"Digenerate: {datetime.now().strftime('%d %B %Y, %H:%M')}", kecil_muted_style))
    story.append(Spacer(1, 14))

    # ---- Ringkasan ----
    story.append(Paragraph("Ringkasan Kelas", subjudul_style))
    ringkasan_rows = [
        ["Total Siswa", str(total_siswa)],
        ["Rata-rata Kompetensi Kelas", f"{rata_rata_kompetensi}%"],
        ["Sub-topik Perlu Perhatian", f"{subtopik_kritis_count} sub-topik"],
    ]
    t_ringkasan = Table(ringkasan_rows, colWidths=[8 * cm, 8 * cm])
    t_ringkasan.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748B')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
    ]))
    story.append(t_ringkasan)

    # ---- Daftar Siswa ----
    story.append(Paragraph("Daftar Siswa", subjudul_style))
    if not daftar_siswa:
        story.append(Paragraph("Belum ada data siswa dengan nilai di kelas ini.", kecil_muted_style))
    else:
        header = ["Nama", "NIS", "Rata-rata Nilai", "Status"]
        rows = [header] + [
            [s["nama"], s["nis"], str(s["nilai_rata_rata"]), s["status"]] for s in daftar_siswa
        ]
        t_siswa = Table(rows, colWidths=[6 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm], repeatRows=1)
        t_siswa.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        story.append(t_siswa)

    # ---- Rekomendasi Model Pembelajaran ----
    story.append(Paragraph("Rekomendasi Model Pembelajaran per Sub-topik", subjudul_style))
    if not daftar_rekomendasi:
        story.append(Paragraph("Belum ada data asesmen untuk menghitung rekomendasi.", kecil_muted_style))
    else:
        for r in daftar_rekomendasi:
            model_text = r["model_rekomendasi"] or "Kelas heterogen — perlu tinjauan manual guru"
            story.append(Paragraph(f"<b>{r['subtopik_nama']}</b> - {model_text}", styles['Normal']))
            detail = (
                f"Sudah Tuntas {r['persen_tuntas']}% · Sedang Berkembang {r['persen_berkembang']}% · "
                f"Belum Dikuasai {r['persen_belum']}%"
            )
            story.append(Paragraph(detail, kecil_muted_style))
            story.append(Spacer(1, 8))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
