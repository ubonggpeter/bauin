"use client";

import { useTheme } from "@/context/ThemeContext";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

type Props = {
  className?: string;
  /** Render as a full labelled row (for settings page) vs icon-only button (for nav) */
  variant?: "icon" | "row";
};

export default function ThemeToggle({ className = "", variant = "icon" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center justify-between w-full ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-text-dark">
              {isDark ? "Dark mode" : "Light mode"}
            </p>
            <p className="text-xs text-gray-500">
              {isDark ? "Switch to light" : "Switch to dark"}
            </p>
          </div>
        </div>

        {/* Pill toggle */}
        <div className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${isDark ? "bg-primary" : "bg-gray-200"}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? "translate-x-6" : "translate-x-0"}`} />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex items-center justify-center rounded-xl transition-colors ${className}`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
