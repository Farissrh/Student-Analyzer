import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { toStatusKey, type StatusKey } from '../../services/mappers'
import { triggerDownload } from '../../services/download'
import Badge from '../../components/ui/Badge'
import ModalDetailSiswa from './ModalDetailSiswa'

interface SiswaRow {
  id: number
  nama: string
  nis: string
  kelasNama: string
  nilaiRataRata: number
  status: StatusKey
  avatar: string
}

const avatarColors = ['#1E3A8A', '#059669', '#7C3AED', '#DC2626', '#D97706', '#0891B2']

// Catatan: status per siswa di dashboard ini dihitung dari RATA-RATA nilai siswa
// di semua sub-topik (bukan per sub-topik individual seperti di Competency Mapping
// Engine backend). Ini simplifikasi buat ringkasan cepat di dashboard - untuk detail
// per sub-topik, guru klik "Detail" untuk buka modal.
function statusDariRataRata(nilai: number): StatusKey {
  if (nilai >= 75) return 'tuntas'
  if (nilai >= 60) return 'berkembang'
  return 'belum'
}

export default function DashboardGuru() {
  const { dark } = useTheme()
  const { kelasList, loadingKelas } = useAppData()

  const [siswaRows, setSiswaRows] = useState<SiswaRow[]>([])
  const [subtopikBermasalahCount, setSubtopikBermasalahCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('Semua')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  useEffect(() => {
    if (loadingKelas || kelasList.length === 0) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all(kelasList.map(k => api.getHeatmap(k.id)))
      .then(heatmaps => {
        if (cancelled) return

        const rows: SiswaRow[] = []
        const subtopikBelumMap = new Map<string, { total: number; belum: number }>()

        heatmaps.forEach(hm => {
          hm.siswa.forEach((s, i) => {
            const cells = hm.cells.filter(c => c.siswa_id === s.id && c.nilai !== null)
            const nilaiRataRata = cells.length > 0
              ? Math.round(cells.reduce((sum, c) => sum + (c.nilai || 0), 0) / cells.length)
              : 0
            rows.push({
              id: s.id,
              nama: s.nama,
              nis: s.nis,
              kelasNama: hm.kelas_nama,
              nilaiRataRata,
              status: statusDariRataRata(nilaiRataRata),
              avatar: s.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
            })
          })

          hm.subtopik.forEach(st => {
            const cellsForSt = hm.cells.filter(c => c.subtopik_id === st.id && c.tingkat_penguasaan !== null)
            if (cellsForSt.length === 0) return
            const belum = cellsForSt.filter(c => c.tingkat_penguasaan === 'Belum Dikuasai').length
            const existing = subtopikBelumMap.get(st.nama) || { total: 0, belum: 0 }
            subtopikBelumMap.set(st.nama, { total: existing.total + cellsForSt.length, belum: existing.belum + belum })
          })
        })

        // Sub-topik "kritis" = mayoritas (>=50%) siswa lintas kelas Belum Dikuasai
        let kritisCount = 0
        subtopikBelumMap.forEach(v => { if (v.belum / v.total >= 0.5) kritisCount++ })

        setSiswaRows(rows)
        setSubtopikBermasalahCount(kritisCount)
      })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat data dashboard') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [kelasList, loadingKelas])

  if (loadingKelas || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat dashboard...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  const filtered = siswaRows.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)
    const matchKelas = filterKelas === 'Semua' || s.kelasNama === filterKelas
    const matchStatus = filterStatus === 'Semua' || s.status === filterStatus
    return matchSearch && matchKelas && matchStatus
  })

  const totalSiswa = siswaRows.length
  const avgKompetensi = totalSiswa > 0 ? Math.round(siswaRows.reduce((a, b) => a + b.nilaiRataRata, 0) / totalSiswa) : 0
  const perluPerhatian = siswaRows.filter(s => s.status === 'belum').length

  const handleExport = async () => {
    // Laporan itu per-kelas - kalau filter lagi "Semua", pakai kelas pertama di daftar
    const targetKelas = filterKelas === 'Semua'
      ? kelasList[0]
      : kelasList.find(k => k.nama === filterKelas)
    if (!targetKelas) return

    setExporting(true)
    setExportError(null)
    try {
      const blob = await api.exportLaporanKelas(targetKelas.id)
      triggerDownload(blob, `Laporan_${targetKelas.nama.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Gagal export laporan')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {selectedSiswa && (
        <ModalDetailSiswa
          siswa={{ id: selectedSiswa.id, nama: selectedSiswa.nama, nis: selectedSiswa.nis, kelas: selectedSiswa.kelasNama, nilai: selectedSiswa.nilaiRataRata, status: selectedSiswa.status, avatar: selectedSiswa.avatar }}
          onClose={() => setSelectedSiswa(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: 0 }}>Selamat datang 👋</h1>
          <p style={{ color: muted, margin: '4px 0 0', fontSize: 14 }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div>
          <button onClick={handleExport} disabled={exporting} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', backgroundColor: exporting ? '#94A3B8' : '#1E3A8A', color: '#FFFFFF',
            border: 'none', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            cursor: exporting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(30,58,138,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {exporting ? 'Membuat PDF...' : 'Export Laporan PDF'}
          </button>
          {exportError && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#DC2626', textAlign: 'right' }}>{exportError}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Siswa', value: totalSiswa, icon: '👥', color: '#1E3A8A', sub: `${kelasList.length} kelas aktif` },
          { label: 'Rata-rata Kompetensi', value: `${avgKompetensi}%`, icon: '📊', color: '#10B981', sub: 'Semua kelas' },
          { label: 'Sub-topik Kritis', value: subtopikBermasalahCount, icon: '⚠️', color: '#F59E0B', sub: 'Mayoritas belum dikuasai' },
          { label: 'Siswa Perlu Perhatian', value: perluPerhatian, icon: '🔴', color: '#EF4444', sub: 'Rata-rata di bawah 60' },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                <p style={{ margin: '8px 0 4px', fontSize: 30, fontWeight: 800, color: card.color }}>{card.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: muted }}>{card.sub}</p>
              </div>
              <span style={{ fontSize: 28 }}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text, flex: 1 }}>Daftar Siswa</h2>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: muted }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / NIS..."
              style={{ paddingLeft: 26, paddingRight: 12, paddingTop: 6, paddingBottom: 6, borderRadius: 7, border: `1px solid ${border}`, backgroundColor: dark ? '#0F172A' : '#F8FAFC', color: text, fontFamily: 'inherit', fontSize: 12, width: 160, outline: 'none' }}
            />
          </div>
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: dark ? '#0F172A' : '#F8FAFC', color: text, fontFamily: 'inherit', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option>Semua</option>
            {kelasList.map(k => <option key={k.id}>{k.nama}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${border}`, backgroundColor: dark ? '#0F172A' : '#F8FAFC', color: text, fontFamily: 'inherit', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            {['Semua', 'tuntas', 'berkembang', 'belum'].map(s => <option key={s} value={s}>{s === 'Semua' ? 'Semua Status' : s === 'tuntas' ? 'Sudah Tuntas' : s === 'berkembang' ? 'Sedang Berkembang' : 'Belum Dikuasai'}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: muted, fontSize: 13 }}>
            {totalSiswa === 0 ? 'Belum ada data siswa. Tambahkan data lewat endpoint /asesmen dulu.' : 'Tidak ada siswa yang cocok dengan filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: dark ? '#273449' : '#F8FAFC' }}>
                {['Siswa', 'NIS', 'Kelas', 'Rata-rata', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSiswa(s)}
                  style={{ cursor: 'pointer', borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: avatarColors[i % avatarColors.length], color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.avatar}</div>
                      <span style={{ fontWeight: 600, color: text, fontSize: 13 }}>{s.nama}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: muted, fontSize: 12 }}>{s.nis}</td>
                  <td style={{ padding: '12px 16px', color: muted, fontSize: 12 }}>{s.kelasNama}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 700, color: s.nilaiRataRata >= 75 ? '#10B981' : s.nilaiRataRata >= 60 ? '#F59E0B' : '#EF4444', fontSize: 14 }}>{s.nilaiRataRata}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge status={s.status} dark={dark} size="sm" />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, backgroundColor: 'transparent', color: '#1E3A8A', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, fontSize: 12, color: muted }}>
          Menampilkan {filtered.length} dari {totalSiswa} siswa
        </div>
      </div>
    </div>
  )
}
