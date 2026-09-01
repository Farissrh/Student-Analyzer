import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { toStatusKey, type StatusKey } from '../../services/mappers'
import type { HeatmapKelasOut } from '../../services/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const statusColor: Record<StatusKey, { bg: string; border: string; darkBg: string }> = {
  tuntas: { bg: '#D1FAE5', border: '#6EE7B7', darkBg: 'rgba(16,185,129,0.25)' },
  berkembang: { bg: '#FEF3C7', border: '#FCD34D', darkBg: 'rgba(245,158,11,0.25)' },
  belum: { bg: '#FEE2E2', border: '#FCA5A5', darkBg: 'rgba(239,68,68,0.25)' },
  kosong: { bg: '#F1F5F9', border: '#CBD5E1', darkBg: 'rgba(148,163,184,0.15)' },
}

export default function HeatmapKompetensi() {
  const { dark } = useTheme()
  const { kelasList, kelasId, setKelasId } = useAppData()

  const [heatmap, setHeatmap] = useState<HeatmapKelasOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [sortCol, setSortCol] = useState<number | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  useEffect(() => {
    if (kelasId === null) return
    let cancelled = false
    setLoading(true)
    setError(null)

    api.getHeatmap(kelasId)
      .then(data => { if (!cancelled) setHeatmap(data) })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat heatmap') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [kelasId])

  if (kelasId === null) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat daftar kelas...</p>
  }

  if (loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat peta kompetensi kelas...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  if (!heatmap || heatmap.siswa.length === 0 || heatmap.subtopik.length === 0) {
    return (
      <div style={{ padding: 20, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13 }}>
        Belum ada data siswa atau sub-topik untuk kelas ini. Tambahkan data lewat endpoint <code>/asesmen</code> dulu.
      </div>
    )
  }

  const subtopiks = heatmap.subtopik
  const siswaList = heatmap.siswa.map(s => {
    const kompetensi = subtopiks.map(st => {
      const cell = heatmap.cells.find(c => c.siswa_id === s.id && c.subtopik_id === st.id)
      return { status: toStatusKey(cell?.tingkat_penguasaan), nilai: cell?.nilai ?? null }
    })
    return { id: s.id, nama: s.nama, inisial: s.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(), kompetensi }
  })

  const getSortedSiswa = () => {
    if (sortCol === null) return siswaList
    const order: Record<StatusKey, number> = { belum: 0, berkembang: 1, tuntas: 2, kosong: 3 }
    return [...siswaList].sort((a, b) => order[a.kompetensi[sortCol].status] - order[b.kompetensi[sortCol].status])
  }

  const barData = subtopiks.map((st, idx) => {
    const total = siswaList.length
    const tuntas = siswaList.filter(s => s.kompetensi[idx].status === 'tuntas').length
    const berkembang = siswaList.filter(s => s.kompetensi[idx].status === 'berkembang').length
    const belum = siswaList.filter(s => s.kompetensi[idx].status === 'belum').length
    return {
      name: st.nama.length > 12 ? st.nama.slice(0, 10) + '…' : st.nama,
      tuntas: Math.round((tuntas / total) * 100),
      berkembang: Math.round((berkembang / total) * 100),
      belum: Math.round((belum / total) * 100),
    }
  })

  const problemSubtopik = subtopiks.map((st, i) => ({
    nama: st.nama,
    pct: Math.round((siswaList.filter(s => s.kompetensi[i].status === 'belum').length / siswaList.length) * 100),
  })).sort((a, b) => b.pct - a.pct).slice(0, 3)

  const bestSubtopik = subtopiks.map((st, i) => ({
    nama: st.nama,
    pct: Math.round((siswaList.filter(s => s.kompetensi[i].status === 'tuntas').length / siswaList.length) * 100),
  })).sort((a, b) => b.pct - a.pct)[0]

  const sorted = getSortedSiswa()

  return (
    <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 30, zIndex: 1000,
          backgroundColor: dark ? '#1E293B' : '#0F172A', color: '#FFFFFF',
          padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>{tooltip.text}</div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Peta Kompetensi Kelas</h1>
      <p style={{ color: muted, margin: '0 0 24px', fontSize: 14 }}>Distribusi penguasaan sub-topik seluruh siswa</p>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <select value={kelasId} onChange={e => setKelasId(Number(e.target.value))}
              style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: surf, color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['tuntas', 'Sudah Tuntas', '#10B981'], ['berkembang', 'Sedang Berkembang', '#F59E0B'], ['belum', 'Belum Dikuasai', '#EF4444']].map(([, label, color]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: muted }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color as string, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: dark ? '#273449' : '#F8FAFC' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${border}`, minWidth: 140 }}>Siswa</th>
                  {subtopiks.map((st, i) => (
                    <th key={st.id} onClick={() => setSortCol(sortCol === i ? null : i)}
                      style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: sortCol === i ? '#1E3A8A' : muted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 80 }}>
                      {st.nama.length > 10 ? st.nama.slice(0, 9) + '…' : st.nama}
                      {sortCol === i && ' ↕'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((siswa, si) => (
                  <tr key={siswa.id} style={{ borderBottom: si < sorted.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          backgroundColor: '#1E3A8A', color: '#FFFFFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, flexShrink: 0,
                        }}>{siswa.inisial}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{siswa.nama}</span>
                      </div>
                    </td>
                    {siswa.kompetensi.map((k, ci) => {
                      const sc = statusColor[k.status]
                      return (
                        <td key={ci} style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <div
                            onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `${siswa.nama} · ${subtopiks[ci].nama}: ${k.nilai ?? '-'}` })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              width: 32, height: 28, margin: '0 auto',
                              borderRadius: 5,
                              backgroundColor: dark ? sc.darkBg : sc.bg,
                              border: `1px solid ${dark ? 'transparent' : sc.border}`,
                              cursor: 'pointer',
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: text }}>Distribusi Kompetensi per Sub-topik (%)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={border} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="tuntas" name="Sudah Tuntas" stackId="a" fill="#10B981" />
                <Bar dataKey="berkembang" name="Sedang Berkembang" stackId="a" fill="#F59E0B" />
                <Bar dataKey="belum" name="Belum Dikuasai" stackId="a" fill="#EF4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: text }}>Sub-topik Bermasalah</h3>
            {problemSubtopik.map((p, i) => (
              <div key={i} style={{ padding: '10px 12px', backgroundColor: dark ? '#273449' : '#FEF2F2', borderRadius: 8, marginBottom: 8, border: `1px solid ${dark ? '#334155' : '#FECACA'}` }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: text }}>{p.nama}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#EF4444' }}>
                  <strong>{p.pct}%</strong> siswa Belum Dikuasai
                </p>
              </div>
            ))}
            {bestSubtopik && (
              <div style={{ marginTop: 16, padding: '10px 12px', backgroundColor: dark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderRadius: 8, border: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}` }}>
                <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#10B981' }}>Sub-topik Terbaik</p>
                <p style={{ margin: 0, fontSize: 11, color: muted }}>{bestSubtopik.nama} — rata-rata <strong style={{ color: '#10B981' }}>{bestSubtopik.pct}%</strong> tuntas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
