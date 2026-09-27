import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword, resetPasswordWithCode } from "@/api/auth";
import type { OtpChannel } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = "request" | "reset";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("request");
  const [userName, setUserName] = useState("");
  const [channel, setChannel] = useState<OtpChannel>("Email");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await forgotPassword({ userName: userName.trim(), channel });
      toast.success(`Código enviado por ${channel === "Sms" ? "SMS" : "e-mail"}.`);
      setStep("reset");
    } catch (err) {
      setError(toApiErrorMessage(err, "Não foi possível iniciar a redefinição."));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await resetPasswordWithCode({ userName: userName.trim(), code: code.trim(), newPassword });
      toast.success("Senha redefinida. Faça login com a nova senha.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(toApiErrorMessage(err, "Não foi possível redefinir a senha."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Esqueci minha senha" subtitle="Recupere o acesso à sua conta">
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={onRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="userName">Usuário</Label>
            <Input
              id="userName"
              type="email"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              autoComplete="username"
              placeholder="seu.email@rmtecho.com.br"
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Enviar código por</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as OtpChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">E-mail</SelectItem>
                <SelectItem value="Sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" variant="brand" disabled={busy}>
            {busy ? "Enviando…" : "Enviar código"}
          </Button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={onReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código recebido</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              disabled={busy}
            />
          </div>
          <Button type="submit" className="w-full" variant="brand" disabled={busy}>
            {busy ? "Redefinindo…" : "Redefinir senha"}
          </Button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-brand underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      </div>
    </AuthShell>
  );
}
