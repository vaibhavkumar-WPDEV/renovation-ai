"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) ?? "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  const icons: Record<Theme, string> = {
    light: "☀",
    dark: "☾",
    system: "◑",
  };

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {icons[theme]}
    </button>
  );
}
