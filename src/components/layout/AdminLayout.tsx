import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AppWindow, Building2, Home, Users } from "lucide-react";
import { AppShell } from "./AppShell";
import { cn } from "@/lib/utils";

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm font-medium transition-colors",
    isActive
      ? "border-brand text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

/** Casca das telas de administração: AppShell + navegação secundária + título. */
export function AdminLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <div className="mb-6 border-b border-border">
        <nav className="flex items-center gap-6">
          <NavLink to="/admin" end className={subNavClass}>
            <Home className="h-4 w-4" /> Início
          </NavLink>
          <NavLink to="/admin/apps" className={subNavClass}>
            <AppWindow className="h-4 w-4" /> Aplicativos
          </NavLink>
          <NavLink to="/admin/users" className={subNavClass}>
            <Users className="h-4 w-4" /> Usuários
          </NavLink>
          <NavLink to="/admin/clientes" className={subNavClass}>
            <Building2 className="h-4 w-4" /> Clientes e sites
          </NavLink>
        </nav>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>

      {children}
    </AppShell>
  );
}
