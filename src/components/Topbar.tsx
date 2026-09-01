import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

interface TopbarProps {
  role: 'guru' | 'siswa'
  userName: string
}

export default function Topbar({ role, userName }: TopbarProps) {
  const { dark, toggleDark } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)

  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header style={{
      height: 60,
      backgroundColor: dark ? '#1E293B' : '#FFFFFF',
      borderBottom: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Search bar */}
      {role === 'guru' && (
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: dark ? '#64748B' : '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Cari siswa, sub-topik..."
            style={{
              paddingLeft: 32,
              paddingRight: 16,
              paddingTop: 7,
              paddingBottom: 7,
              borderRadius: 8,
              border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: dark ? '#0F172A' : '#F8FAFC',
              color: dark ? '#F1F5F9' : '#0F172A',
              fontFamily: 'inherit',
              fontSize: 13,
              width: 240,
              outline: 'none',
            }}
          />
        </div>
      )}
      {role === 'siswa' && <div />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={dark ? 'Light mode' : 'Dark mode'}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dark ? '#F1F5F9' : '#64748B',
          }}
        >
          {dark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>

        {/* Notification bell (guru only) */}
        {role === 'guru' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: dark ? '#F1F5F9' : '#64748B',
                position: 'relative',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                border: '2px solid white',
              }} />
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 280,
                backgroundColor: dark ? '#1E293B' : '#FFFFFF',
                border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
                borderRadius: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                zIndex: 100,
              }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, fontWeight: 600, fontSize: 13, color: dark ? '#F1F5F9' : '#0F172A' }}>Notifikasi</div>
                {[
                  { name: 'Budi Santoso', msg: 'Nilai Stoikiometri di bawah KKM', time: '5 mnt lalu' },
                  { name: 'Siti Rahayu', msg: 'Belum mengerjakan kuis minggu ini', time: '1 jam lalu' },
                  { name: 'Ahmad Fauzi', msg: 'Tren nilai menurun 3 minggu berturut', time: '2 jam lalu' },
                ].map((n, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: i < 2 ? `1px solid ${dark ? '#334155' : '#F1F5F9'}` : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: dark ? '#F1F5F9' : '#0F172A' }}>{n.name}</div>
                    <div style={{ fontSize: 11, color: dark ? '#94A3B8' : '#64748B', marginTop: 2 }}>{n.msg}</div>
                    <div style={{ fontSize: 10, color: dark ? '#64748B' : '#94A3B8', marginTop: 3 }}>{n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#1E3A8A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#F1F5F9' : '#0F172A' }}>{userName}</div>
            <div style={{ fontSize: 10, color: dark ? '#94A3B8' : '#64748B' }}>{role === 'guru' ? 'Guru Kimia' : 'Siswa'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
