import { useState, useCallback, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("app-theme") === "dark";
    } catch {
      return false;
    }
  });

  // Keep the html class in sync with state
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("app-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  return { isDark, toggle };
}
