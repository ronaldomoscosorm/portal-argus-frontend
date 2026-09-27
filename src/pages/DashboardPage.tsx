import { LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppCard } from "@/components/AppCard";
import { EmptyState } from "@/components/PageState";
import { useAuth } from "@/context/AuthContext";
import type { MeAppDto } from "@/api/types";

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const onOpenApp = (app: MeAppDto) => {
    // Abre o app em nova aba. O SSO real entre apps (cookie em .rmtecho.com.br)
    // é tarefa da Fase 6 nos apps de destino.
    window.open(app.url, "_blank", "noopener,noreferrer");
  };

  const apps = [...user.apps].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Olá, {user.name ?? user.userName}
        </h1>
        {(user.profile?.jobTitle || user.profile?.department) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {user.profile?.jobTitle ? `${user.profile.jobTitle}` : ""}
            {user.profile?.jobTitle && user.profile?.department ? " · " : ""}
            {user.profile?.department ?? ""}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione uma aplicação para acessar.
        </p>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-8 w-8" />}
          title="Nenhuma aplicação atribuída"
          description="Você ainda não tem acesso a nenhuma aplicação. Contate o administrador do Portal Argus."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onOpen={onOpenApp} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
