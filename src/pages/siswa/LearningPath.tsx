import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import type { LangkahLearningPathOut } from '../../services/types'

type NodeStatus = 'selesai' | 'aktif' | 'belum'

function statusNode(langkah: LangkahLearningPathOut, indexAktif: number, i: number): NodeStatus {
  if (langkah.status === 'Sudah Tuntas') return 'selesai'
  if (i === indexAktif) return 'aktif'
  return 'belum'
}

export default function LearningPath() {
  const { dark } = useTheme()
  const { currentSiswaId } = useAppData()

  const [langkah, setLangkah] = useState<LangkahLearningPathOut[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'

  const muat = (regenerate: boolean) => {
    if (currentSiswaId === null) return
    if (regenerate) setRegenerating(true); else setLoading(true)
    setError(null)
    api.getLearningPath(currentSiswaId, regenerate)
      .then(data => {
        setLangkah(data.langkah)
        // auto-expand node aktif pertama kali dimuat
        const idxAktif = data.langkah.findIndex(l => l.status !== 'Sudah Tuntas')
        if (idxAktif >= 0) setExpanded(idxAktif)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Gagal memuat learning path'))
      .finally(() => { setLoading(false); setRegenerating(false) })
  }

  useEffect(() => { muat(false) }, [currentSiswaId])

  if (currentSiswaId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat learning path...</p>
  }

  if (error) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  if (langkah.length === 0) {
    return (
      <div style={{ padding: 24, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13, textAlign: 'center' }}>
        Belum ada sub-topik untuk disusun jadi learning path.
      </div>
    )
  }

  const indexAktif = langkah.findIndex(l => l.status !== 'Sudah Tuntas')
  const selesai = langkah.filter(l => l.status === 'Sudah Tuntas').length
  const total = langkah.length

  const nodeColor: Record<NodeStatus, string> = {
    selesai: '#10B981',
    aktif: '#1E3A8A',
    belum: dark ? '#334155' : '#CBD5E1',
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: 0 }}>Learning Path</h1>
        <button onClick={() => muat(true)} disabled={regenerating}
          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: 'transparent', color: muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: regenerating ? 'not-allowed' : 'pointer' }}>
          {regenerating ? 'Menyusun ulang...' : '↻ Susun Ulang'}
        </button>
      </div>
      <p style={{ color: muted, margin: '0 0 6px', fontSize: 13 }}>
        ✨ Jalur ini disusun AI berdasarkan hasil diagnosis kompetensimu
      </p>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 20px', marginTop: 26, marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{selesai} dari {total} sub-topik selesai</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{Math.round((selesai / total) * 100)}%</span>
        </div>
        <div style={{ height: 8, backgroundColor: dark ? '#334155' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(selesai / total) * 100}%`, backgroundColor: '#10B981', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 27, top: 30, bottom: 30, width: 2, background: `linear-gradient(to bottom, #10B981 ${(selesai / total) * 100}%, ${dark ? '#334155' : '#E2E8F0'} ${(selesai / total) * 100}%)`, zIndex: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {langkah.map((l, i) => {
            const status = statusNode(l, indexAktif, i)
            const isExpanded = expanded === i
            return (
              <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: '50%',
                    backgroundColor: status === 'selesai' ? '#10B981' : status === 'aktif' ? '#1E3A8A' : (dark ? '#273449' : '#FFFFFF'),
                    border: status === 'aktif' ? '3px solid #10B981' : status === 'belum' ? `3px solid ${dark ? '#475569' : '#CBD5E1'}` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: status === 'aktif' ? '0 0 0 6px rgba(16,185,129,0.2)' : 'none',
                  }}>
                    {status === 'selesai' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : status === 'aktif' ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.2 }}>Di<br/>sini</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#64748B' : '#94A3B8' }}>{i + 1}</span>
                    )}
                  </div>
                </div>

                <div onClick={() => setExpanded(isExpanded ? null : i)}
                  style={{ flex: 1, backgroundColor: surf, border: `1px solid ${status === 'aktif' ? '#1E3A8A' : border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', boxShadow: status === 'aktif' ? '0 4px 12px rgba(30,58,138,0.15)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: status === 'belum' ? muted : text }}>{l.subtopik_nama}</span>
                      {status === 'aktif' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, backgroundColor: 'rgba(30,58,138,0.1)', color: '#1E3A8A' }}>Sedang Berjalan</span>}
                      {status === 'selesai' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Selesai ✓</span>}
                    </div>
                    <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: muted }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: muted, lineHeight: 1.5 }}>{l.alasan}</p>
                      {status !== 'selesai' && (
                        <button disabled={status !== 'aktif'}
                          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', backgroundColor: status === 'aktif' ? '#1E3A8A' : (dark ? '#334155' : '#E2E8F0'), color: status === 'aktif' ? '#FFFFFF' : muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: status === 'aktif' ? 'pointer' : 'not-allowed' }}>
                          {status === 'aktif' ? 'Lanjutkan →' : 'Terkunci 🔒'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
