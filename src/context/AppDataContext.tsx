import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../services/api'
import type { KelasOut } from '../services/types'
import { useAuth } from './AuthContext'

interface AppDataContextType {
  kelasList: KelasOut[]
  kelasId: number | null
  setKelasId: (id: number) => void
  loadingKelas: boolean
  errorKelas: string | null
  reloadKelas: () => void
  currentSiswaId: number | null
}

const AppDataContext = createContext<AppDataContextType>({
  kelasList: [],
  kelasId: null,
  setKelasId: () => {},
  loadingKelas: false,
  errorKelas: null,
  reloadKelas: () => {},
  currentSiswaId: null,
})

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { role, userId, token } = useAuth()

  const [kelasList, setKelasList] = useState<KelasOut[]>([])
  const [kelasId, setKelasId] = useState<number | null>(null)
  const [loadingKelas, setLoadingKelas] = useState(false)
  const [errorKelas, setErrorKelas] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // Daftar kelas cuma relevan & cuma boleh diakses kalau login sebagai guru
  // (endpoint GET /kelas diproteksi require_guru di backend).
  useEffect(() => {
    if (role !== 'guru' || !token) {
      setKelasList([])
      setKelasId(null)
      return
    }

    let cancelled = false
    setLoadingKelas(true)
    setErrorKelas(null)

    api.getKelasList()
      .then(list => {
        if (cancelled) return
        setKelasList(list)
        if (list.length > 0) setKelasId(prev => prev ?? list[0].id)
      })
      .catch(err => { if (!cancelled) setErrorKelas(err.message || 'Gagal memuat daftar kelas') })
      .finally(() => { if (!cancelled) setLoadingKelas(false) })

    return () => { cancelled = true }
  }, [role, token, reloadTick])

  return (
    <AppDataContext.Provider value={{
      kelasList,
      kelasId,
      setKelasId,
      loadingKelas,
      errorKelas,
      reloadKelas: () => setReloadTick(t => t + 1),
      currentSiswaId: role === 'siswa' ? userId : null,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}

export const useAppData = () => useContext(AppDataContext)
