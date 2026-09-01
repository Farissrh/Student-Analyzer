import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { dark, toggleDark } = useTheme()
  const { loginGuru, loginSiswa, loading, error } = useAuth()
  const [tab, setTab] = useState<'guru' | 'siswa'>('guru')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return
    try {
      if (tab === 'guru') await loginGuru(username, password)
      else await loginSiswa(username, password)
      // Sukses -> App.tsx otomatis re-render ke halaman utama karena role di AuthContext berubah
    } catch {
      // Error sudah ditangani & disimpan di AuthContext (ditampilkan di bawah form)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    color: dark ? '#F1F5F9' : '#0F172A',
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
          width: 38,
          height: 38,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
        }}
      >
        {dark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )}
      </button>

      {/* Left branding (60%) */}
      <div
        className="hex-pattern"
        style={{
          width: '60%',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1e4fa8 40%, #0f2d6e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative hex shapes */}
        <div style={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '40px solid rgba(16,185,129,0.08)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 40,
          right: -60,
          width: 300,
          height: 300,
          borderRadius: '50%',
          border: '50px solid rgba(255,255,255,0.04)',
        }} />

        <div style={{ maxWidth: 480, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* App icon */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 20px 40px rgba(16,185,129,0.3)',
          }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
          </div>

          <h1 style={{ color: '#FFFFFF', fontSize: 42, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Chemistry<br />Student Analyzer
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18, margin: '16px 0 48px', lineHeight: 1.5 }}>
            Analisis Kompetensi Kimia Berbasis AI
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {['Peta Kompetensi AI', 'Kuis Adaptif', 'Rekomendasi Pembelajaran', 'Learning Path Personal'].map(f => (
              <span key={f} style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.85)',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form (40%) */}
      <div style={{
        width: '40%',
        backgroundColor: dark ? '#0F172A' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: dark ? '#F1F5F9' : '#0F172A', margin: '0 0 6px' }}>Masuk ke Akun</h2>
          <p style={{ color: dark ? '#94A3B8' : '#64748B', fontSize: 14, margin: '0 0 28px' }}>Pilih peran dan masukkan kredensial Anda</p>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: dark ? '#1E293B' : '#F1F5F9',
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
          }}>
            {(['guru', 'siswa'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  backgroundColor: tab === t ? '#1E3A8A' : 'transparent',
                  color: tab === t ? '#FFFFFF' : dark ? '#94A3B8' : '#64748B',
                }}
              >
                {t === 'guru' ? '👩‍🏫 Guru' : '🎓 Siswa'}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: dark ? '#CBD5E1' : '#374151', marginBottom: 6 }}>
                {tab === 'guru' ? 'Username' : 'NIS (Nomor Induk Siswa)'}
              </label>
              <input
                style={inputStyle}
                placeholder={tab === 'guru' ? 'Masukkan username' : 'Masukkan NIS'}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: dark ? '#CBD5E1' : '#374151', marginBottom: 6 }}>
                Password
              </label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: dark ? '#94A3B8' : '#64748B' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#1E3A8A' }} />
                Ingat saya
              </label>
              <a href="#" style={{ fontSize: 13, color: '#1E3A8A', textDecoration: 'none', fontWeight: 500 }}>Lupa password?</a>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                backgroundColor: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                border: '1px solid #FCA5A5', color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 9,
                border: 'none',
                backgroundColor: loading ? '#6B7280' : '#1E3A8A',
                color: '#FFFFFF',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(30,58,138,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: dark ? '#64748B' : '#94A3B8' }}>
            SMA Negeri 1 Jakarta · Tahun Ajaran 2025/2026
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
