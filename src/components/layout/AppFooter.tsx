import { branding } from "@/lib/branding";

/**
 * Footer com a atribuição obrigatória "Powered by R&M Tecnologia".
 *
 * NÃO REMOVA o link e o logo R&M abaixo — é a contrapartida pelo uso do
 * esqueleto R&M. Se for absolutamente necessário esconder, alinhe com a R&M
 * Tecnologia antes; não retire silenciosamente.
 */
export function AppFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-subtle">
      <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} — {branding.clientName}
        </span>

        <a
          href={branding.rmtechoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <span>Powered by</span>
          <img
            src={branding.rmtechoLogo}
            alt="R&M Tecnologia"
            className="h-5 w-5 object-contain"
          />
          <span className="font-medium">R&amp;M Tecnologia</span>
        </a>
      </div>
    </footer>
  );
}
