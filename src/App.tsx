import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'

// Guru pages
import DashboardGuru from './pages/guru/DashboardGuru'
import PanelAnalisis from './pages/guru/PanelAnalisis'
import PantauProgres from './pages/guru/PantauProgres'
import HeatmapKompetensi from './pages/guru/HeatmapKompetensi'
import RekomendasiModel from './pages/guru/RekomendasiModel'
import ManajemenData from './pages/guru/ManajemenData'

// Siswa pages
import DashboardSiswa from './pages/siswa/DashboardSiswa'
import KuisAdaptif from './pages/siswa/KuisAdaptif'
import LearningPath from './pages/siswa/LearningPath'
import HasilDiagnosis from './pages/siswa/HasilDiagnosis'
import ProfilSiswa from './pages/siswa/ProfilSiswa'

type Role = 'guru' | 'siswa'

const defaultPage: Record<Role, string> = {
  guru: 'dashboard-guru',
  siswa: 'dashboard-siswa',
}

function AppContent() {
  const { role, nama, logout } = useAuth()
  const [page, setPage] = useState('')

  // Begitu role berubah (login/logout), arahkan ke halaman default role itu
  useEffect(() => {
    if (role) setPage(defaultPage[role])
    else setPage('')
  }, [role])

  const handleNavigate = (p: string) => setPage(p)

  if (!role) return <LoginPage />

  const renderPage = () => {
    switch (page) {
      // Guru
      case 'dashboard-guru': return <DashboardGuru />
      case 'panel-analisis': return <PanelAnalisis />
      case 'pantau-progres': return <PantauProgres />
      case 'heatmap': return <HeatmapKompetensi />
      case 'rekomendasi': return <RekomendasiModel />
      case 'manajemen-data': return <ManajemenData />
      // Siswa
      case 'dashboard-siswa': return <DashboardSiswa onNavigate={handleNavigate} />
      case 'kuis-adaptif': return <KuisAdaptif />
      case 'learning-path': return <LearningPath />
      case 'hasil-diagnosis': return <HasilDiagnosis />
      case 'profil-siswa': return <ProfilSiswa />
      default: return null
    }
  }

  return (
    <Layout role={role} activePage={page} onNavigate={handleNavigate} onLogout={logout} userName={nama}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
