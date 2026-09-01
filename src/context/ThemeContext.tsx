import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ThemeContextType {
  dark: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextType>({ dark: false, toggleDark: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggleDark: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
