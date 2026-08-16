import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
interface ThemeContextType { theme: Theme; toggleTheme?: () => void; premiumTheme: boolean; togglePremiumTheme: () => void; switchable: boolean; }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
interface ThemeProviderProps { children: React.ReactNode; defaultTheme?: Theme; switchable?: boolean; }

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) return (localStorage.getItem("theme") as Theme) || defaultTheme;
    return defaultTheme;
  });
  const [premiumTheme, setPremiumTheme] = useState(() => localStorage.getItem("premium-theme") === "true");
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("premium-theme", premiumTheme);
    if (switchable) localStorage.setItem("theme", theme);
    localStorage.setItem("premium-theme", String(premiumTheme));
  }, [theme, premiumTheme, switchable]);
  const toggleTheme = switchable ? () => setTheme(prev => prev === "light" ? "dark" : "light") : undefined;
  const togglePremiumTheme = () => setPremiumTheme(prev => !prev);
  return <ThemeContext.Provider value={{ theme, toggleTheme, premiumTheme, togglePremiumTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useTheme must be used within ThemeProvider"); return context; }
