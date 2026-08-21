"use client";

import { RegisterForm } from "@/components/RegisterForm";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/components/LanguageContext";

/**
 * Self check-in: o convidado escaneia o QR na tela, confirma o email da inscrição,
 * faz o check-in no evento ativo e já recebe o crédito na mesma tela.
 */
export default function CheckinPage() {
  const { t } = useLanguage();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />

      <div className="fixed right-4 top-4 z-50 flex items-center gap-3">
        <LanguageSelector />
      </div>

      <header className="mb-12 text-center animate-fade-in">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center">
          <svg className="h-16 w-16" viewBox="0 0 466.73 532.09" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39Z"
              fill="currentColor"
              className="text-foreground"
            />
          </svg>
        </div>

        <div className="mb-6">
          <AvailabilityBadge />
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("checkinTitle")}
        </h1>

        <p className="mx-auto max-w-md text-muted">
          {t("checkinSubtitle")}
          <br />
          <span className="font-medium text-foreground">{t("checkinCta")}</span>
        </p>
      </header>

      <section className="w-full flex justify-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <RegisterForm selfCheckin />
      </section>

      <footer className="mt-16 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <p className="text-xs text-muted">{t("checkinFooter")}</p>
      </footer>
    </main>
  );
}
