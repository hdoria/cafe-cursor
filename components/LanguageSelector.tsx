"use client";

import { useLanguage } from "./LanguageContext";
import { Locale } from "@/lib/translations";

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  const languages: { code: Locale; flag: string; label: string }[] = [
    { code: "pt-BR", flag: "🇧🇷", label: "PT" },
    { code: "en", flag: "🇺🇸", label: "EN" },
    { code: "es", flag: "🇪🇸", label: "ES" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 backdrop-blur-sm">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
            locale === lang.code
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
          aria-label={`Mudar para ${lang.label}`}
        >
          <span className="text-base">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
