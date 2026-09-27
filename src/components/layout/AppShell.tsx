import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

/** Layout das telas autenticadas: header sticky + main + footer "Powered by". */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 py-8">{children}</main>
      <AppFooter />
    </div>
  );
}
