import type { ReactNode } from "react";
import { branding } from "@/lib/branding";

/**
 * Layout centrado das telas públicas de autenticação (login, esqueci a senha).
 * Fundo com gradiente da marca à esquerda + card à direita, responsivo.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-subtle">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={branding.clientLogo}
              alt={branding.clientName}
              className="mb-3 h-14 w-14 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </div>
      <footer className="pb-6 text-center">
        <a
          href={branding.rmtechoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Powered by</span>
          <img
            src={branding.rmtechoLogo}
            alt="R&M Tecnologia"
            className="h-4 w-4 object-contain"
          />
          <span className="font-medium">R&amp;M Tecnologia</span>
        </a>
      </footer>
    </div>
  );
}
