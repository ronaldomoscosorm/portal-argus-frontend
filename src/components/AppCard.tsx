import { ExternalLink } from "lucide-react";
import type { MeAppDto } from "@/api/types";
import { Badge } from "@/components/ui/badge";

interface AppCardProps {
  app: MeAppDto;
  onOpen: (app: MeAppDto) => void;
}

/** Card de aplicação no painel do usuário. Abre o app em nova aba. */
export function AppCard({ app, onOpen }: AppCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          {app.iconUrl ? (
            <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{app.code.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand" />
      </div>

      <div className="w-full">
        <div className="font-semibold text-foreground">{app.displayName}</div>
        {app.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {app.description}
          </p>
        )}
      </div>

      {app.profile && (
        <Badge variant="secondary" className="mt-auto">
          Perfil: {app.profile.name}
        </Badge>
      )}
    </button>
  );
}
