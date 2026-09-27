import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchMeMfa, updateMeMfa } from "@/api/me";
import type { MfaMethod } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { MFA_METHOD_OPTIONS, isE164, mfaMethodLabel, toQrSrc } from "@/lib/labels";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SecurityPage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["me", "mfa"],
    queryFn: fetchMeMfa,
  });

  const [method, setMethod] = useState<MfaMethod>("None");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setMethod(data.method);
      setPhoneNumber(data.phoneNumber ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateMeMfa({
        method,
        phoneNumber: method === "Sms" ? phoneNumber.trim() : null,
      }),
    onSuccess: async (updated) => {
      toast.success("Configuração de 2FA atualizada.");
      queryClient.setQueryData(["me", "mfa"], updated);
      await refreshUser();
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível salvar.")),
  });

  const onSave = () => {
    setPhoneError(null);
    if (method === "Sms" && !isE164(phoneNumber)) {
      setPhoneError("Informe um telefone no formato E.164 (ex.: +5511999998888).");
      return;
    }
    mutation.mutate();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Segurança</h1>
            <p className="text-sm text-muted-foreground">
              Configure a verificação em duas etapas (2FA) da sua conta.
            </p>
          </div>
        </div>

        {isLoading ? (
          <InlineLoader />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Método de 2FA
                <Badge variant={data?.method === "None" ? "muted" : "success"}>
                  Atual: {mfaMethodLabel(data?.method)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Escolha como você prefere confirmar sua identidade ao entrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Método</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as MfaMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MFA_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {method === "Sms" && (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone (E.164)</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+5511999998888"
                  />
                  {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
                </div>
              )}

              {method === "Totp" && data?.qrCode && (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR code no seu app autenticador e salve para ativar.
                  </p>
                  <img
                    src={toQrSrc(data.qrCode)}
                    alt="QR code para 2FA"
                    className="h-44 w-44 rounded bg-white p-2"
                  />
                  {data.secretKey && (
                    <code className="rounded bg-background px-2 py-1 text-xs">
                      {data.secretKey}
                    </code>
                  )}
                </div>
              )}

              {method === "None" && (
                <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Sem 2FA, sua conta fica protegida apenas pela senha. Recomendamos ativar
                  um segundo fator.
                </p>
              )}

              <div className="flex justify-end">
                <Button variant="brand" onClick={onSave} disabled={mutation.isPending}>
                  {mutation.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
