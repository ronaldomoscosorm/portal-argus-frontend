import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordWithToken } from "@/api/auth";
import { toApiErrorMessage } from "@/api/client";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Redefinição de senha por link (fluxo iniciado pelo admin em
 * <c>POST /api/users/{id}/send-password-reset-link</c>). A URL do e-mail traz
 * <c>?token=&lt;JWT&gt;</c>; esta página coleta a nova senha e chama
 * <c>POST /api/Auth/reset-password</c>.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Link inválido — token ausente.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    try {
      await resetPasswordWithToken({ resetToken: token, newPassword });
      setDone(true);
      toast.success("Senha redefinida. Faça login com a nova senha.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(toApiErrorMessage(err, "Não foi possível redefinir a senha. O link pode ter expirado."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Definir nova senha" subtitle="Portal Argus">
      {!token && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Link inválido ou incompleto. Abra o link do e-mail exatamente como recebido, ou solicite
            um novo ao seu administrador.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {done ? (
        <p className="text-sm text-muted-foreground">
          Redirecionando para o login…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={busy || !token}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              disabled={busy || !token}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="brand"
            disabled={busy || !token}
          >
            {busy ? "Salvando…" : "Definir senha"}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-brand underline-offset-4 hover:underline"
            >
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
