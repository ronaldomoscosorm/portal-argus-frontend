import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, Shield, ShieldCheck, UserCircle } from "lucide-react";
import { branding } from "@/lib/branding";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

/** Header das telas autenticadas: marca + navegação + menu do usuário. */
export function AppHeader() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = user?.name ?? user?.userName ?? "Usuário";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={branding.clientLogo}
            alt={branding.clientName}
            className="h-9 w-9 object-contain"
          />
          <span className="text-base font-bold tracking-tight text-foreground">
            {branding.clientName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutGrid className="h-4 w-4" />
            Painel
          </NavLink>
          <NavLink to="/security" className={navLinkClass}>
            <ShieldCheck className="h-4 w-4" />
            Segurança
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              <Shield className="h-4 w-4" />
              Administração
            </NavLink>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <UserCircle className="h-6 w-6 text-brand" />
            <span className="hidden max-w-[12rem] truncate md:inline">{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user?.userName}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/security")}>
              <ShieldCheck /> Segurança
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => navigate("/admin")}>
                <Shield /> Administração
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
