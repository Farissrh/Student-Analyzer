import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import type { SubTopikOut, RiwayatNilaiPoin } from '../../services/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const lineColors = ['#1E3A8A', '#10B981', '#F59E0B', '#8B5CF6', '#DC2626', '#0891B2']

const rentangBulan: Record<string, number | null> = {
  '1 Bulan': 1, '3 Bulan': 3, '6 Bulan': 6, '1 Tahun': 12, 'Semua': null,
}

interface SubtopikRiwayat {
  subtopik: SubTopikOut
  data: RiwayatNilaiPoin[]
}

export default function PantauProgres() {
  const { dark } = useTheme()
  const { kelasList, kelasId, setKelasId } = useAppData()
  const [rentang, setRentang] = useState('6 Bulan')

  const [subtopikRiwayat, setSubtopikRiwayat] = useState<SubtopikRiwayat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  useEffect(() => {
    if (kelasId === null) return
    let cancelled = false
    setLoading(true)
    setError(null)

    api.getSubTopikList()
      .then(async (subtopikList) => {
        const hasil = await Promise.all(
          subtopikList.map(async (st) => {
            const data = await api.getRiwayatKelasSubtopik(kelasId, st.id)
            return { subtopik: st, data }
          })
        )
        if (!cancelled) setSubtopikRiwayat(hasil.filter(h => h.data.length > 0))
      })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat progres') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [kelasId])

  if (kelasId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat data progres...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  // Filter berdasarkan rentang waktu yang dipilih
  const batasBulan = rentangBulan[rentang]
  const cutoff = batasBulan ? new Date(Date.now() - batasBulan * 30 * 24 * 60 * 60 * 1000) : null
  const filtered = subtopikRiwayat.map(sr => ({
    ...sr,
    data: cutoff ? sr.data.filter(d => new Date(d.tanggal) >= cutoff) : sr.data,
  })).filter(sr => sr.data.length > 0)

  // Gabungkan semua sub-topik jadi 1 dataset untuk grafik utama (union semua tanggal)
  const semuaTanggal = Array.from(new Set(filtered.flatMap(sr => sr.data.map(d => d.tanggal)))).sort()
  const mainData = semuaTanggal.map(tanggal => {
    const row: Record<string, string | number> = { tanggal }
    filtered.forEach(sr => {
      const poin = sr.data.find(d => d.tanggal === tanggal)
      if (poin) row[sr.subtopik.nama] = poin.rata_rata_nilai
    })
    return row
  })

  // Sub-topik dengan tren menurun (nilai terakhir < nilai pertama dalam rentang yang difilter)
  const trendMenurun = filtered.filter(sr => {
    if (sr.data.length < 2) return false
    return sr.data[sr.data.length - 1].rata_rata_nilai < sr.data[0].rata_rata_nilai
  })

  const kelasNama = kelasList.find(k => k.id === kelasId)?.nama || ''

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Pantau Progres</h1>
      <p style={{ color: muted, margin: '0 0 24px', fontSize: 14 }}>Tren nilai kelas berdasarkan sub-topik kimia</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kelas</label>
          <select value={kelasId} onChange={e => setKelasId(Number(e.target.value))}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: surf, color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rentang</label>
          <select value={rentang} onChange={e => setRentang(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: surf, color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {Object.keys(rentangBulan).map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {trendMenurun.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', backgroundColor: dark ? 'rgba(245,158,11,0.12)' : '#FFFBEB', border: `1px solid ${dark ? 'rgba(245,158,11,0.3)' : '#FCD34D'}`, borderRadius: 9, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: dark ? '#FCD34D' : '#92400E', fontWeight: 500 }}>
            Sub-topik dengan tren menurun: <strong>{trendMenurun.map(sr => sr.subtopik.nama).join(', ')}</strong>
          </p>
        </div>
      )}

      {mainData.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13, textAlign: 'center' }}>
          Belum ada histori nilai untuk kelas ini pada rentang waktu yang dipilih.
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: text }}>Progres Rata-rata Nilai Kelas — {kelasNama}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mainData}>
                <CartesianGrid strokeDasharray="3 3" stroke={border} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: muted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {filtered.map((sr, i) => (
                  <Line key={sr.subtopik.id} type="monotone" dataKey={sr.subtopik.nama} stroke={lineColors[i % lineColors.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {filtered.map((sr, i) => {
              const first = sr.data[0].rata_rata_nilai
              const last = sr.data[sr.data.length - 1].rata_rata_nilai
              const trend = last > first ? 'up' : last < first ? 'down' : 'stable'
              const color = lineColors[i % lineColors.length]
              return (
                <div key={sr.subtopik.id} style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{sr.subtopik.nama}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color }}>{last}</span>
                      <span style={{ fontSize: 11, color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : muted }}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={sr.data}>
                      <Line type="monotone" dataKey="rata_rata_nilai" stroke={color} strokeWidth={2} dot={false} />
                      <Tooltip contentStyle={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11 }} formatter={(v) => [v, 'Nilai']} labelFormatter={(l) => l} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
