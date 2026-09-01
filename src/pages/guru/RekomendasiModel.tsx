import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { toModelKey, type ModelKey } from '../../services/mappers'
import type { RekomendasiOut } from '../../services/types'

const modelConfig: Record<ModelKey, { label: string; emoji: string; color: string; darkBg: string; bg: string }> = {
  discovery: { label: 'Discovery Learning', emoji: '💡', color: '#2563EB', bg: '#EFF6FF', darkBg: 'rgba(37,99,235,0.15)' },
  pbl: { label: 'Problem Based Learning', emoji: '🧩', color: '#7C3AED', bg: '#F5F3FF', darkBg: 'rgba(124,58,237,0.15)' },
  project: { label: 'Project Based Learning', emoji: '🚀', color: '#059669', bg: '#ECFDF5', darkBg: 'rgba(5,150,105,0.15)' },
}

function alasanText(r: RekomendasiOut): string {
  const pct = r.kondisi_dominan === 'Belum Dikuasai' ? r.persen_belum_dikuasai
    : r.kondisi_dominan === 'Sedang Berkembang' ? r.persen_sedang_berkembang
    : r.persen_sudah_tuntas
  const pola = r.pola_kesalahan_dominan_kelas || 'Campuran'
  return `${pct}% siswa ${r.kondisi_dominan}, pola kesalahan ${pola} dominan`
}

export default function RekomendasiModel() {
  const { dark } = useTheme()
  const { kelasList, kelasId, setKelasId } = useAppData()

  const [data, setData] = useState<RekomendasiOut[]>([])
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

    api.getRekomendasiSemua(kelasId)
      .then(res => { if (!cancelled) setData(res) })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat rekomendasi') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [kelasId])

  if (kelasId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat rekomendasi model pembelajaran...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 6px' }}>Rekomendasi Model Pembelajaran</h1>
          <p style={{ color: muted, margin: 0, fontSize: 14 }}>Berdasarkan agregasi peta kompetensi seluruh siswa per sub-topik</p>
        </div>
        <select value={kelasId} onChange={e => setKelasId(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: surf, color: text, fontFamily: 'inherit', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {Object.entries(modelConfig).map(([, cfg]) => (
          <span key={cfg.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            backgroundColor: dark ? cfg.darkBg : cfg.bg,
            color: cfg.color, fontSize: 12, fontWeight: 600,
            border: `1px solid ${dark ? 'transparent' : cfg.bg}`,
          }}>
            {cfg.emoji} {cfg.label}
          </span>
        ))}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          backgroundColor: dark ? 'rgba(148,163,184,0.1)' : '#F8FAFC',
          color: muted, fontSize: 12, fontWeight: 600,
          border: `1px solid ${border}`,
        }}>
          ℹ️ Tinjau Manual
        </span>
      </div>

      {data.length === 0 ? (
        <div style={{ padding: 20, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13 }}>
          Belum ada data asesmen untuk kelas ini, jadi belum ada rekomendasi yang bisa dihitung.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((r) => {
            const modelKey = toModelKey(r.model_rekomendasi)
            const cfg = modelKey ? modelConfig[modelKey] : null
            const edge = !r.model_rekomendasi

            return (
              <div key={r.subtopik_id} style={{
                backgroundColor: surf, border: `1px solid ${border}`,
                borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: edge ? `4px solid ${dark ? '#475569' : '#CBD5E1'}` : `4px solid ${cfg?.color || border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: text }}>{r.subtopik_nama}</h3>
                      {cfg ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px', borderRadius: 20,
                          backgroundColor: dark ? cfg.darkBg : cfg.bg,
                          color: cfg.color, fontSize: 12, fontWeight: 700,
                        }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px', borderRadius: 20,
                          backgroundColor: dark ? 'rgba(148,163,184,0.1)' : '#F8FAFC',
                          color: muted, fontSize: 12, fontWeight: 700,
                          border: `1px solid ${border}`,
                        }}>
                          ℹ️ Kelas Heterogen
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: muted, lineHeight: 1.5 }}>
                      {r.catatan || alasanText(r)}
                    </p>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                        <div style={{ flex: r.persen_sudah_tuntas, backgroundColor: '#10B981', minWidth: r.persen_sudah_tuntas > 0 ? 3 : 0 }} />
                        <div style={{ flex: r.persen_sedang_berkembang, backgroundColor: '#F59E0B', minWidth: r.persen_sedang_berkembang > 0 ? 3 : 0 }} />
                        <div style={{ flex: r.persen_belum_dikuasai, backgroundColor: '#EF4444', minWidth: r.persen_belum_dikuasai > 0 ? 3 : 0 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                        {[
                          { label: 'Tuntas', pct: r.persen_sudah_tuntas, color: '#10B981' },
                          { label: 'Berkembang', pct: r.persen_sedang_berkembang, color: '#F59E0B' },
                          { label: 'Belum', pct: r.persen_belum_dikuasai, color: '#EF4444' },
                        ].map(d => (
                          <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: muted }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: d.color, display: 'inline-block' }} />
                            {d.label}: <strong style={{ color: d.color }}>{d.pct}%</strong>
                          </span>
                        ))}
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 10, color: muted }}>{r.jumlah_siswa_dihitung} siswa dihitung</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
