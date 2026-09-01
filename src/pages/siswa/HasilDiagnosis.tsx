import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import { toStatusKey, pesanPolaKesalahan } from '../../services/mappers'
import type { PetaKompetensiOut } from '../../services/types'

export default function HasilDiagnosis() {
  const { dark } = useTheme()
  const { currentSiswaId } = useAppData()

  const [peta, setPeta] = useState<PetaKompetensiOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'
  const bg = dark ? '#0F172A' : '#F8FAFC'

  useEffect(() => {
    if (currentSiswaId === null) return
    let cancelled = false
    setLoading(true)
    api.getPetaKompetensiSiswa(currentSiswaId)
      .then(data => { if (!cancelled) setPeta(data) })
      .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat diagnosis') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentSiswaId])

  // Nuansa warna ramah untuk siswa: "belum" pakai oranye lembut, bukan merah alarm
  const getColor = (status: string) => status === 'tuntas' ? '#10B981' : status === 'berkembang' ? '#F59E0B' : '#F97316'
  const getStatusLabel = (status: string) => status === 'tuntas' ? 'Sudah Tuntas' : status === 'berkembang' ? 'Sedang Berkembang' : 'Perlu Diperkuat'

  // Saran belajar dibuat dari sub-topik yang masih Belum Dikuasai (heuristik sederhana,
  // TIDAK menyebut model pembelajaran apapun - sesuai revisi dospem, itu khusus guru).
  // Nanti bisa diganti generate AI lewat Groq begitu Learning Path/Kuis Adaptif jadi.
  const saran = peta
    .filter(p => p.tingkat_penguasaan === 'Belum Dikuasai')
    .slice(0, 3)
    .map(p => ({ icon: '📖', teks: `Pelajari ulang materi ${p.subtopik_nama} — coba kerjakan latihan sederhana dulu` }))

  if (loading) return <p style={{ color: muted, fontSize: 14 }}>Memuat peta kompetensimu...</p>
  if (error) return (
    <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
      {error}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 4px' }}>Peta Kompetensi Kamu</h1>
        <p style={{ color: muted, margin: 0, fontSize: 13 }}>
          {peta.length > 0 ? `Diperbarui terakhir: ${new Date(peta[0].diperbarui_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Belum ada data diagnosis'}
        </p>
      </div>

      {peta.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 10, color: muted, fontSize: 13, textAlign: 'center' }}>
          Belum ada hasil asesmen untukmu. Kerjakan kuis dulu supaya peta kompetensimu muncul di sini.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {peta.map((d) => {
              const status = toStatusKey(d.tingkat_penguasaan)
              const color = getColor(status)
              const circumference = 2 * Math.PI * 28
              const progress = (d.nilai / 100) * circumference

              return (
                <div key={d.subtopik_id} style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                      <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="30" cy="30" r="28" fill="none" stroke={dark ? '#334155' : '#E2E8F0'} strokeWidth="4" />
                        <circle cx="30" cy="30" r="28" fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
                      </svg>
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 12, fontWeight: 800, color }}>{Math.round(d.nilai)}</span>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: text }}>{d.subtopik_nama}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, backgroundColor: status === 'tuntas' ? (dark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : status === 'berkembang' ? (dark ? 'rgba(245,158,11,0.15)' : '#FFFBEB') : (dark ? 'rgba(249,115,22,0.15)' : '#FFF7ED'), color }}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.5 }}>{pesanPolaKesalahan(d.pola_kesalahan_dominan, status)}</p>
                </div>
              )
            })}
          </div>

          <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: text }}>Rekomendasi Belajar Untukmu ✨</h2>
            {saran.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: muted }}>Kerja bagus! Semua sub-topik yang sudah dinilai berada di jalur yang baik.</p>
            ) : (
              <>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>Berdasarkan peta kompetensimu, berikut aktivitas yang bisa membantu:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {saran.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', backgroundColor: bg, borderRadius: 9, border: `1px solid ${border}` }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <span style={{ fontSize: 13, color: text }}>{s.teks}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
