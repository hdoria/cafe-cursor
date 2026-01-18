"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { Locale } from "@/lib/translations";

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Locale; flag: string; label: string }[] = [
    { code: "pt-BR", flag: "🇧🇷", label: "Português" },
    { code: "en", flag: "🇺🇸", label: "English" },
    { code: "es", flag: "🇪🇸", label: "Español" },
  ];

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background"
        aria-label="Selecionar idioma"
      >
        <span className="text-base">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded-lg border border-border bg-background/95 py-1 shadow-lg backdrop-blur-sm">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                locale === lang.code
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && (
                <svg className="ml-auto h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
