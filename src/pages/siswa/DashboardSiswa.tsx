import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PetaKompetensiOut, RingkasanBelajarOut, LangkahLearningPathOut, SiswaProfilOut } from '../../services/types'

interface Props {
  onNavigate: (page: string) => void
}

export default function DashboardSiswa({ onNavigate }: Props) {
  const { dark } = useTheme()
  const { currentSiswaId } = useAppData()

  const [profil, setProfil] = useState<SiswaProfilOut | null>(null)
  const [peta, setPeta] = useState<PetaKompetensiOut[]>([])
  const [ringkasan, setRingkasan] = useState<RingkasanBelajarOut | null>(null)
  const [subtopikSelanjutnya, setSubtopikSelanjutnya] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'
  const bg = dark ? '#0F172A' : '#F8FAFC'

  const statusColor: Record<string, string> = { tuntas: '#10B981', berkembang: '#F59E0B', belum: '#EF4444', kosong: '#94A3B8' }

  useEffect(() => {
    if (currentSiswaId === null) return
    Promise.all([
      api.getProfilSiswa(currentSiswaId),
      api.getPetaKompetensiSiswa(currentSiswaId),
      api.getRingkasanBelajar(currentSiswaId),
      api.getLearningPath(currentSiswaId),
    ])
      .then(([profilData, petaData, ringkasanData, lpData]) => {
        setProfil(profilData)
        setPeta(petaData)
        setRingkasan(ringkasanData)
        const aktif = lpData.langkah.find((l: LangkahLearningPathOut) => l.status !== 'Sudah Tuntas')
        setSubtopikSelanjutnya(aktif?.subtopik_nama || null)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard'))
      .finally(() => setLoading(false))
  }, [currentSiswaId])

  if (currentSiswaId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat dashboard...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  const tuntas = peta.filter(p => p.tingkat_penguasaan === 'Sudah Tuntas').length
  const berkembang = peta.filter(p => p.tingkat_penguasaan === 'Sedang Berkembang').length
  const belum = peta.filter(p => p.tingkat_penguasaan === 'Belum Dikuasai').length
  const donutData = [
    { name: 'Sudah Tuntas', value: tuntas, color: '#10B981' },
    { name: 'Sedang Berkembang', value: berkembang, color: '#F59E0B' },
    { name: 'Belum Dikuasai', value: belum, color: '#EF4444' },
  ].filter(d => d.value > 0)

  const miniCards = [
    { icon: '📖', label: 'Sub-topik Selanjutnya', value: subtopikSelanjutnya || '-', sub: 'Direkomendasikan AI', color: '#1E3A8A' },
    { icon: '📊', label: 'Sub-topik Dinilai', value: `${peta.length} topik`, sub: 'Total sudah ada data', color: '#8B5CF6' },
    { icon: '✅', label: 'Kuis Selesai Minggu Ini', value: `${ringkasan?.kuis_minggu_ini ?? 0} kuis`, sub: 'Dari Kuis Adaptif', color: '#10B981' },
    { icon: '⭐', label: 'Rata-rata Skor Kuis', value: ringkasan?.rata_rata_skor_kuis != null ? `${Math.round(ringkasan.rata_rata_skor_kuis)} poin` : '-', sub: `${ringkasan?.total_kuis_selesai ?? 0} kuis dikerjakan`, color: '#F59E0B' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: 0 }}>Halo, {profil?.nama || 'Siswa'}! 👋</h1>
        <p style={{ color: muted, margin: '4px 0 0', fontSize: 14 }}>
          Semangat belajar hari ini! Kamu sudah menyelesaikan {tuntas} dari {peta.length || '0'} sub-topik yang dinilai.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: text }}>Status Kompetensi Keseluruhan</h3>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: muted }}>{peta.length} Sub-topik Dinilai</p>
          {donutData.length === 0 ? (
            <p style={{ padding: '30px 0', fontSize: 12, color: muted }}>Belum ada data. Coba kerjakan kuis dulu!</p>
          ) : (
            <>
              <PieChart width={220} height={160} style={{ margin: '0 auto' }}>
                <Pie data={donutData} cx={110} cy={80} innerRadius={48} outerRadius={75} dataKey="value" paddingAngle={4}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} sub-topik`, name]} contentStyle={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {donutData.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: d.color, display: 'inline-block' }} />
                      {d.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16 }}>
          {miniCards.map((card, i) => (
            <div key={i} style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{card.icon}</span>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: 11, color: muted, fontWeight: 500 }}>{card.label}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: card.color }}>{card.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: muted }}>{card.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>Progres per Sub-topik</h3>
          <button onClick={() => onNavigate('learning-path')} style={{ fontSize: 12, color: '#1E3A8A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Lihat Learning Path →</button>
        </div>
        {peta.length === 0 ? (
          <p style={{ fontSize: 13, color: muted }}>Belum ada data progres. Kerjakan kuis untuk mulai memetakan kompetensimu.</p>
        ) : (
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {peta.map((s) => {
              const statusKey = s.tingkat_penguasaan === 'Sudah Tuntas' ? 'tuntas' : s.tingkat_penguasaan === 'Sedang Berkembang' ? 'berkembang' : 'belum'
              return (
                <div key={s.subtopik_id} style={{ minWidth: 160, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 14, flexShrink: 0 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: text }}>{s.subtopik_nama}</p>
                  <div style={{ height: 6, backgroundColor: dark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${s.nilai}%`, backgroundColor: statusColor[statusKey], borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[statusKey] }}>{Math.round(s.nilai)}%</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, backgroundColor: statusKey === 'tuntas' ? (dark ? 'rgba(16,185,129,0.15)' : '#D1FAE5') : statusKey === 'berkembang' ? (dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7') : (dark ? 'rgba(239,68,68,0.15)' : '#FEE2E2'), color: statusColor[statusKey] }}>
                      {statusKey === 'tuntas' ? 'Tuntas' : statusKey === 'berkembang' ? 'Berkembang' : 'Belum'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #10B981 100%)', padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>Siap belajar hari ini?</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>AI telah menyiapkan soal yang disesuaikan dengan level kompetensimu</p>
        </div>
        <button onClick={() => onNavigate('kuis-adaptif')}
          style={{ padding: '13px 28px', borderRadius: 10, border: 'none', backgroundColor: '#FFFFFF', color: '#1E3A8A', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', flexShrink: 0 }}>
          Mulai Kuis Adaptif ✨
        </button>
      </div>
    </div>
  )
}
