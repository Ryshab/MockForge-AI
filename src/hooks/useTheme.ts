import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);
  return theme;
}
