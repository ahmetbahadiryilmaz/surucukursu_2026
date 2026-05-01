// ThemeProvider.tsx

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // storageKey'in undefined olmaması için ekstra kontrol
  const actualStorageKey = storageKey || "ui-theme";
  
  console.log("ThemeProvider storageKey:", actualStorageKey); // Debug için
  
  // localStorage kontrolünü direkt useState içinde yapıyoruz
  const [theme, setTheme] = useState<Theme>(() => {
    // Client-side'da mıyız kontrol et
    if (typeof window !== "undefined") {
      try {
        // Önce mevcut bozuk key'i temizle
        const brokenKey = localStorage.getItem("undefined-ui-theme");
        if (brokenKey) {
          localStorage.removeItem("undefined-ui-theme");
          localStorage.setItem(actualStorageKey, brokenKey);
        }
        
        const storedTheme = localStorage.getItem(actualStorageKey) as Theme
        console.log("Stored theme:", storedTheme); // Debug için
        
        if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
          return storedTheme
        }
      } catch (error) {
        console.warn("Theme localStorage read error:", error);
      }
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      
      console.log("System theme detected:", systemTheme); // Debug için
      root.classList.add(systemTheme)
      return
    }

    console.log("Applying theme:", theme); // Debug için
    root.classList.add(theme)
  }, [theme])

  // Tema değiştiğinde localStorage'a kaydet
  useEffect(() => {
    try {
      console.log("Saving theme to localStorage:", actualStorageKey, theme); // Debug için
      localStorage.setItem(actualStorageKey, theme)
    } catch (error) {
      console.warn("Theme localStorage write error:", error);
    }
  }, [theme, actualStorageKey])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log("Theme changing from", theme, "to", newTheme); // Debug için
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
