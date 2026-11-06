import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Send } from "lucide-react";
import { login, sendMfaCode, verifyMfa } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import type { MfaMethod, OtpChannel } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { toQrSrc } from "@/lib/labels";
import { isSafeReturnUrl } from "@/lib/jwt";
import { tokenIsPortalAdmin } from "@/lib/portalAdmin";
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

type Step = "credentials" | "mfa";

// A ArthosMFA devolve as mensagens de autenticação em inglês; traduzimos as
// conhecidas para pt-BR, mantendo a original como fallback.
const AUTH_MESSAGES_PT_BR: Record<string, string> = {
  "Invalid credentials": "Usuário ou senha inválidos.",
  "User not found": "Usuário ou senha inválidos.",
  "Invalid MFA code": "Código de verificação inválido.",
  "Invalid or expired MFA token": "Sessão de verificação expirada. Faça o login novamente.",
};

function friendly(message: string | null | undefined, fallback: string): string {
  if (!message) return fallback;
  return AUTH_MESSAGES_PT_BR[message] ?? message;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("credentials");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [channel, setChannel] = useState<OtpChannel>("Email");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMessageMethod = mfaMethod === "Email" || mfaMethod === "Sms";

  // SSO passivo: se o usuário já está autenticado e a rota /login foi chamada
  // com ?returnUrl=..., pula o formulário e vai direto pra origem — sem exigir
  // que ele digite senha de novo só pra bater no returnUrl. Sem returnUrl,
  // aplica a regra padrão (admin → /admin/apps, senão → /).
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const rUrl = searchParams.get("returnUrl");
    // eslint-disable-next-line no-console
    console.log("[portal] LoginPage — já autenticado", {
      returnUrl: rUrl,
      returnUrlSafe: isSafeReturnUrl(rUrl),
      isAdmin,
    });
    if (isSafeReturnUrl(rUrl)) {
      window.location.href = rUrl!;
      return;
    }
    navigate(isAdmin ? "/admin/apps" : "/", { replace: true });
  }, [authLoading, isAuthenticated, isAdmin, searchParams, navigate]);

  const finalize = async (token: string, refreshToken: string | null) => {
    // eslint-disable-next-line no-console
    console.log("[portal] finalize chamado", {
      tokenPresente: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 20)}…(${token.length} chars)` : null,
      refreshPresente: Boolean(refreshToken),
    });

    await setSession(token, refreshToken);
    // eslint-disable-next-line no-console
    console.log("[portal] setSession OK — token gravado no localStorage");

    const returnUrl = searchParams.get("returnUrl");
    const returnUrlSafe = isSafeReturnUrl(returnUrl);
    const isAdmin = tokenIsPortalAdmin(token);
    // eslint-disable-next-line no-console
    console.log("[portal] decisão pós-login", {
      returnUrl,
      returnUrlSafe,
      isAdmin,
      destinoPrevisto: returnUrlSafe ? returnUrl : isAdmin ? "/admin/apps" : "/",
    });

    if (returnUrlSafe) {
      window.location.href = returnUrl!;
      return;
    }
    navigate(isAdmin ? "/admin/apps" : "/", { replace: true });
  };

  const onSubmitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = await login({ userName: userName.trim(), password });
      // eslint-disable-next-line no-console
      console.log("[portal] login() retornou", {
        success: result.success,
        mfaRequired: result.mfaRequired,
        temToken: Boolean(result.token),
        mensagem: result.message,
        keys: Object.keys(result ?? {}),
      });
      if (!result.success) {
        // eslint-disable-next-line no-console
        console.warn("[portal] login com success=false — abortando", result);
        setError(friendly(result.message, "Usuário ou senha inválidos."));
        return;
      }
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setMfaMethod(result.mfaMethod ?? "Totp");
        setQrCode(result.qrCode);
        setStep("mfa");
        // Para Email/SMS o código é enviado automaticamente.
        if ((result.mfaMethod === "Email" || result.mfaMethod === "Sms") && result.mfaToken) {
          const ch: OtpChannel = result.mfaMethod === "Sms" ? "Sms" : "Email";
          setChannel(ch);
          try {
            await sendMfaCode({ mfaToken: result.mfaToken, channel: ch });
            setInfo(`Enviamos um código por ${ch === "Sms" ? "SMS" : "e-mail"}.`);
          } catch {
            /* fallback: o usuário pode reenviar manualmente */
          }
        }
        return;
      }
      if (result.token) {
        await finalize(result.token, result.refreshToken);
      } else {
        // eslint-disable-next-line no-console
        console.error("[portal] success=true mas SEM token — response inesperado", result);
        setError("Login inconsistente: servidor não devolveu o token de acesso.");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[portal] exceção no submit do login", err);
      setError(toApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSendCode = async () => {
    if (!mfaToken) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await sendMfaCode({ mfaToken, channel });
      setInfo(`Código enviado por ${channel === "Sms" ? "SMS" : "e-mail"}.`);
    } catch (err) {
      setError(toApiErrorMessage(err, "Não foi possível enviar o código."));
    } finally {
      setBusy(false);
    }
  };

  const onSubmitMfa = async (event: FormEvent) => {
    event.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setBusy(true);
    try {
      const result = await verifyMfa({ mfaToken, mfaCode: mfaCode.trim() });
      if (!result.success || !result.token) {
        setError(friendly(result.message, "Código de verificação inválido."));
        return;
      }
      await finalize(result.token, result.refreshToken);
    } catch (err) {
      setError(toApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Portal Argus" subtitle="Acesse suas aplicações">
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-md border border-brand/30 bg-brand/10 p-3 text-sm text-foreground">
          {info}
        </div>
      )}

      {step === "credentials" && (
        <form onSubmit={onSubmitCredentials} className="space-y-4">
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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </div>
          <Button type="submit" className="w-full" variant="brand" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-brand underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      )}

      {step === "mfa" && (
        <form onSubmit={onSubmitMfa} className="space-y-4">
          {qrCode && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/40 p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Primeiro acesso — configure o app autenticador
              </p>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR code abaixo (Google Authenticator, Microsoft Authenticator,
                etc.) e depois digite o código de 6 dígitos gerado.
              </p>
              <img
                src={toQrSrc(qrCode)}
                alt="QR code para configuração do 2FA"
                className="h-44 w-44 rounded bg-white p-2"
              />
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {mfaMethod === "Totp" || qrCode
              ? "Digite o código de 6 dígitos do seu app autenticador."
              : "Digite o código que enviamos para você."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="mfaCode">Código de verificação</Label>
            <Input
              id="mfaCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              required
              disabled={busy}
            />
          </div>

          {isMessageMethod && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Reenviar por</Label>
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
              <Button
                type="button"
                variant="outline"
                onClick={onSendCode}
                disabled={busy}
              >
                <Send className="h-4 w-4" /> Enviar código
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full" variant="brand" disabled={busy}>
            {busy ? "Verificando…" : "Verificar"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setStep("credentials");
              setMfaCode("");
              setError(null);
              setInfo(null);
            }}
          >
            Voltar
          </button>
        </form>
      )}
    </AuthShell>
  );
}
