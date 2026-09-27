import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-subtle p-4 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Button asChild variant="brand">
        <Link to="/">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
