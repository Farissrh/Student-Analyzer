import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import Badge, { type Status } from '../../components/ui/Badge'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api, ApiError } from '../../services/api'
import { toStatusKey } from '../../services/mappers'
import type { PetaKompetensiOut, RiwayatNilaiPoin } from '../../services/types'

interface Siswa {
  id: number
  nama: string
  nis: string
  kelas: string
  nilai: number
  status: Status
  avatar: string
}

interface Props {
  siswa: Siswa
  onClose: () => void
}

export default function ModalDetailSiswa({ siswa, onClose }: Props) {
  const { dark } = useTheme()
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'peta' | 'riwayat'>('ringkasan')
  const [peta, setPeta] = useState<PetaKompetensiOut[]>([])
  const [riwayat, setRiwayat] = useState<RiwayatNilaiPoin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const bg = dark ? '#0F172A' : '#F8FAFC'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.getPetaKompetensiSiswa(siswa.id),
      api.getRiwayatSiswa(siswa.id),
    ])
      .then(([petaData, riwayatData]) => {
        if (cancelled) return
        setPeta(petaData)
        setRiwayat(riwayatData)
      })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat data') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [siswa.id])

  const tuntas = peta.filter(p => p.tingkat_penguasaan === 'Sudah Tuntas').length
  const berkembang = peta.filter(p => p.tingkat_penguasaan === 'Sedang Berkembang').length
  const belum = peta.filter(p => p.tingkat_penguasaan === 'Belum Dikuasai').length
  const donutData = [
    { name: 'Sudah Tuntas', value: tuntas, color: '#10B981' },
    { name: 'Sedang Berkembang', value: berkembang, color: '#F59E0B' },
    { name: 'Belum Dikuasai', value: belum, color: '#EF4444' },
  ].filter(d => d.value > 0)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 640, maxHeight: '88vh', backgroundColor: surf, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${border}` }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#1E3A8A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{siswa.avatar}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>{siswa.nama}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: muted }}>NIS: {siswa.nis} · {siswa.kelas}</p>
          </div>
          <Badge status={siswa.status} dark={dark} />
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${border}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 24px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 0 }}>
          {([['ringkasan', 'Ringkasan'], ['peta', 'Peta Kompetensi'], ['riwayat', 'Riwayat Nilai']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '12px 18px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === id ? 700 : 500, color: activeTab === id ? '#1E3A8A' : muted, borderBottom: activeTab === id ? '2px solid #1E3A8A' : '2px solid transparent', transition: 'all 0.15s' }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && <p style={{ color: muted, fontSize: 13 }}>Memuat data...</p>}
          {error && <p style={{ color: '#DC2626', fontSize: 13 }}>{error}</p>}

          {!loading && !error && activeTab === 'ringkasan' && (
            peta.length === 0 ? (
              <p style={{ color: muted, fontSize: 13 }}>Belum ada data asesmen untuk siswa ini.</p>
            ) : (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ backgroundColor: bg, borderRadius: 10, padding: 20, marginBottom: 16, border: `1px solid ${border}` }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rata-rata Nilai</p>
                    <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: siswa.nilai >= 75 ? '#10B981' : siswa.nilai >= 60 ? '#F59E0B' : '#EF4444' }}>{siswa.nilai}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {donutData.map(d => (
                      <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: bg, borderRadius: 8, border: `1px solid ${border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
                          <span style={{ fontSize: 13, color: text }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ width: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value + ' sub-topik', name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p style={{ textAlign: 'center', fontSize: 12, color: muted, margin: 0 }}>{peta.length} Sub-topik Total</p>
                </div>
              </div>
            )
          )}

          {!loading && !error && activeTab === 'peta' && (
            peta.length === 0 ? (
              <p style={{ color: muted, fontSize: 13 }}>Belum ada data asesmen untuk siswa ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {peta.map((p) => {
                  const statusKey = toStatusKey(p.tingkat_penguasaan)
                  return (
                    <div key={p.subtopik_id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', backgroundColor: bg, borderRadius: 9, border: `1px solid ${border}` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: text }}>{p.subtopik_nama}</p>
                        {p.pola_kesalahan_dominan !== 'Minimal' && (
                          <p style={{ margin: '3px 0 0', fontSize: 11, color: muted }}>Pola dominan: {p.pola_kesalahan_dominan} · nilai {p.nilai}</p>
                        )}
                      </div>
                      <Badge status={statusKey} dark={dark} size="sm" />
                    </div>
                  )
                })}
              </div>
            )
          )}

          {!loading && !error && activeTab === 'riwayat' && (
            riwayat.length === 0 ? (
              <p style={{ color: muted, fontSize: 13 }}>Belum ada histori nilai untuk siswa ini.</p>
            ) : (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>
                  Rata-rata nilai (lintas sub-topik) dari {riwayat[0].tanggal} sampai {riwayat[riwayat.length - 1].tanggal}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={riwayat}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, 'Rata-rata nilai']} />
                    <Line type="monotone" dataKey="rata_rata_nilai" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
