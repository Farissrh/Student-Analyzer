import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api, ApiError, setAuthToken } from '../services/api'

type Role = 'guru' | 'siswa'

interface AuthState {
  token: string | null
  role: Role | null
  userId: number | null
  nama: string
}

interface AuthContextType extends AuthState {
  loginGuru: (username: string, password: string) => Promise<void>
  loginSiswa: (nis: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
}

const STORAGE_KEY = 'csa_auth'
const emptyState: AuthState = { token: null, role: null, userId: null, nama: '' }

const AuthContext = createContext<AuthContextType>({
  ...emptyState,
  loginGuru: async () => {},
  loginSiswa: async () => {},
  logout: () => {},
  loading: false,
  error: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore sesi dari localStorage waktu app dibuka ulang (biar nggak perlu login terus)
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed: AuthState = JSON.parse(raw)
        setState(parsed)
        setAuthToken(parsed.token)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const persist = (s: AuthState) => {
    setState(s)
    setAuthToken(s.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }

  const loginGuru = async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.loginGuru(username, password)
      persist({ token: res.access_token, role: 'guru', userId: res.user_id, nama: res.nama })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login gagal, coba lagi')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loginSiswa = async (nis: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.loginSiswa(nis, password)
      persist({ token: res.access_token, role: 'siswa', userId: res.user_id, nama: res.nama })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login gagal, coba lagi')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    persist(emptyState)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ ...state, loginGuru, loginSiswa, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
