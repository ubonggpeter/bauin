"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LOCALES = [
  { code: "en", flag: "🇬🇧" },
  { code: "yo", flag: "🇳🇬" },
  { code: "ha", flag: "🇳🇬" },
  { code: "ig", flag: "🇳🇬" },
] as const;

type Props = {
  /** "select" renders a dropdown; "pills" renders inline pill buttons */
  variant?: "select" | "pills";
  className?: string;
};

function getStoredLocale(): string {
  if (typeof document === "undefined") return "en";
  return document.cookie.match(/bauin-locale=([^;]+)/)?.[1] ?? "en";
}

export default function LanguageSwitcher({ variant = "select", className = "" }: Props) {
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [current, setCurrent] = useState<string>(() => getStoredLocale());

  function switchLocale(locale: string) {
    document.cookie = `bauin-locale=${locale};path=/;max-age=31536000;samesite=lax`;
    setCurrent(locale);
    router.refresh();
  }

  if (variant === "pills") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {LOCALES.map(({ code, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              current === code
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {flag} {t(code as "en")}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400 flex-shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <select
        value={current}
        onChange={(e) => switchLocale(e.target.value)}
        className="text-xs font-medium text-gray-600 bg-transparent border-none outline-none cursor-pointer"
        aria-label={t("label")}
      >
        {LOCALES.map(({ code, flag }) => (
          <option key={code} value={code}>
            {flag} {t(code as "en")}
          </option>
        ))}
      </select>
    </div>
  );
}
