import { useTheme } from '../context/ThemeContext'

type Role = 'guru' | 'siswa'

const guruMenu = [
  { id: 'dashboard-guru', label: 'Dashboard', icon: GridIcon },
  { id: 'panel-analisis', label: 'Panel Analisis', icon: UploadIcon },
  { id: 'pantau-progres', label: 'Pantau Progres', icon: TrendingIcon },
  { id: 'heatmap', label: 'Peta Kompetensi', icon: MapIcon },
  { id: 'rekomendasi', label: 'Rekomendasi', icon: LightbulbIcon },
  { id: 'manajemen-data', label: 'Manajemen Data', icon: DatabaseIcon },
]

const siswaMenu = [
  { id: 'dashboard-siswa', label: 'Dashboard', icon: GridIcon },
  { id: 'kuis-adaptif', label: 'Kuis Adaptif', icon: PencilIcon },
  { id: 'learning-path', label: 'Learning Path', icon: RouteIcon },
  { id: 'hasil-diagnosis', label: 'Hasil Diagnosis', icon: ChartIcon },
  { id: 'profil-siswa', label: 'Profil', icon: UserIcon },
]

interface SidebarProps {
  role: Role
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export default function Sidebar({ role, activePage, onNavigate, onLogout }: SidebarProps) {
  const { dark } = useTheme()
  const menu = role === 'guru' ? guruMenu : siswaMenu

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        backgroundColor: dark ? '#0F172A' : '#1E3A8A',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
      className="hex-pattern"
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Chemistry</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.2 }}>Student Analyzer</div>
          </div>
        </div>
      </div>

      {/* Role label */}
      <div style={{ padding: '12px 20px 8px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: role === 'guru' ? 'rgba(16,185,129,0.2)' : 'rgba(37,99,235,0.3)',
          color: '#10B981',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 20,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {role === 'guru' ? 'Portal Guru' : 'Portal Siswa'}
        </span>
      </div>

      {/* Menu */}
      <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {menu.map(item => {
          const active = activePage === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              {active && (
                <span style={{
                  position: 'absolute',
                  left: 12,
                  width: 3,
                  height: 20,
                  backgroundColor: '#10B981',
                  borderRadius: 2,
                }} />
              )}
              <Icon active={active} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom: Profile + Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 400,
            textAlign: 'left',
            width: '100%',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.15)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  )
}

// Icon components
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  )
}
function TrendingIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}
function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )
}
function LightbulbIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/>
    </svg>
  )
}
function PencilIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}
function RouteIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/>
    </svg>
  )
}
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function DatabaseIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  )
}
