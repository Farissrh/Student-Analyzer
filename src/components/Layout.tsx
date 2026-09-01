import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useTheme } from '../context/ThemeContext'

interface LayoutProps {
  role: 'guru' | 'siswa'
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  userName: string
  children: ReactNode
}

export default function Layout({ role, activePage, onNavigate, onLogout, userName, children }: LayoutProps) {
  const { dark } = useTheme()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: dark ? '#0F172A' : '#F8FAFC' }}>
      <Sidebar role={role} activePage={activePage} onNavigate={onNavigate} onLogout={onLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar role={role} userName={userName} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
