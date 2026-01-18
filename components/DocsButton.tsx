"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";

export function DocsButton() {
  const [hasDocumentation, setHasDocumentation] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    async function checkDocs() {
      try {
        const response = await fetch("/api/docs");
        if (response.ok) {
          const data = await response.json();
          const hasArticles = data.categories?.some(
            (cat: { articles: unknown[] }) => cat.articles && cat.articles.length > 0
          );
          setHasDocumentation(hasArticles);
        }
      } catch (error) {
        console.error("Error checking docs:", error);
      }
    }
    checkDocs();
  }, []);

  if (!hasDocumentation) return null;

  return (
    <Link
      href="/docs"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted hover:bg-background hover:text-foreground transition-colors backdrop-blur-sm"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      {t("viewDocs")}
    </Link>
  );
}
