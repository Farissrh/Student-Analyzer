import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAppData } from '../../context/AppDataContext'
import { api, ApiError } from '../../services/api'
import type { SiswaProfilOut, RingkasanBelajarOut } from '../../services/types'

export default function ProfilSiswa() {
  const { dark, toggleDark } = useTheme()
  const { currentSiswaId } = useAppData()

  const [profil, setProfil] = useState<SiswaProfilOut | null>(null)
  const [ringkasan, setRingkasan] = useState<RingkasanBelajarOut | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const surf = dark ? '#1E293B' : '#FFFFFF'
  const border = dark ? '#334155' : '#E2E8F0'
  const text = dark ? '#F1F5F9' : '#0F172A'
  const muted = dark ? '#94A3B8' : '#64748B'
  const bg = dark ? '#0F172A' : '#F8FAFC'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${border}`, backgroundColor: dark ? '#273449' : '#F1F5F9',
    color: muted, fontFamily: 'inherit', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', cursor: 'not-allowed',
  }

  useEffect(() => {
    if (currentSiswaId === null) return
    Promise.all([api.getProfilSiswa(currentSiswaId), api.getRingkasanBelajar(currentSiswaId)])
      .then(([profilData, ringkasanData]) => {
        setProfil(profilData)
        setRingkasan(ringkasanData)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Gagal memuat profil'))
      .finally(() => setLoading(false))
  }, [currentSiswaId])

  if (currentSiswaId === null || loading) {
    return <p style={{ color: muted, fontSize: 14 }}>Memuat profil...</p>
  }

  if (error || !profil) {
    return (
      <div style={{ padding: 20, backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
        {error || 'Profil tidak ditemukan'}
      </div>
    )
  }

  const inisial = profil.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: text, margin: '0 0 24px' }}>Profil Saya</h1>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 28, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 24, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(30,58,138,0.3)' }}>{inisial}</div>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: text }}>{profil.nama}</h2>
          <p style={{ margin: 0, fontSize: 13, color: muted }}>NIS: {profil.nis} · {profil.kelas_nama}</p>
        </div>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>Informasi Akun</h3>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', backgroundColor: dark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', padding: '3px 10px', borderRadius: 12 }}>⚠️ Read-only</span>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: muted }}>Edit profil belum tersambung ke backend — data di bawah cuma tampilan.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Nama Lengkap</label>
            <input style={inputStyle} value={profil.nama} readOnly />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>NIS</label>
            <input style={inputStyle} value={profil.nis} readOnly />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>Kelas</label>
            <input style={inputStyle} value={profil.kelas_nama} readOnly />
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: text }}>Preferensi</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Mode Tampilan', sub: dark ? 'Gelap aktif' : 'Terang aktif', value: dark, onToggle: toggleDark },
            { label: 'Notifikasi Pengingat Belajar', sub: 'Dapatkan pengingat harian pukul 19.00', value: notifEnabled, onToggle: () => setNotifEnabled(v => !v) },
          ].map((pref, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i === 0 ? `1px solid ${border}` : 'none' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: text }}>{pref.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: muted }}>{pref.sub}</p>
              </div>
              <button onClick={pref.onToggle} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: pref.value ? '#10B981' : (dark ? '#475569' : '#CBD5E1'), position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, left: pref.value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#FFFFFF', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: muted }}>
          Mode tampilan tersambung penuh. Notifikasi baru tersimpan sementara di sesi ini (belum ada backend-nya).
        </p>
      </div>

      <div style={{ backgroundColor: surf, border: `1px solid ${border}`, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: text }}>Ringkasan Belajar</h3>
        <p style={{ margin: '0 0 16px', fontSize: 11, color: muted }}>Dihitung khusus dari Kuis Adaptif (bukan input nilai manual guru)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Kuis Selesai', value: String(ringkasan?.total_kuis_selesai ?? 0), icon: '✅', color: '#10B981' },
            { label: 'Rata-rata Skor', value: ringkasan?.rata_rata_skor_kuis != null ? String(Math.round(ringkasan.rata_rata_skor_kuis)) : '-', icon: '📊', color: '#1E3A8A' },
            { label: 'Sub-topik Favorit', value: ringkasan?.subtopik_favorit ?? '-', icon: '⭐', color: '#F59E0B' },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 9, padding: 14, textAlign: 'center' }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <p style={{ margin: '8px 0 3px', fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: muted }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
