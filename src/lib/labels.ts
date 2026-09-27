import type { MfaMethod } from "@/api/types";

/** Rótulos pt-BR dos métodos de 2FA. */
export const MFA_METHOD_LABELS: Record<MfaMethod, string> = {
  None: "Nenhum",
  Totp: "App autenticador",
  Email: "E-mail",
  Sms: "SMS",
};

export const MFA_METHOD_OPTIONS: { value: MfaMethod; label: string }[] = [
  { value: "None", label: MFA_METHOD_LABELS.None },
  { value: "Totp", label: MFA_METHOD_LABELS.Totp },
  { value: "Email", label: MFA_METHOD_LABELS.Email },
  { value: "Sms", label: MFA_METHOD_LABELS.Sms },
];

export function mfaMethodLabel(method: MfaMethod | null | undefined): string {
  if (!method) return MFA_METHOD_LABELS.None;
  return MFA_METHOD_LABELS[method] ?? method;
}

/** Valida telefone no formato E.164 (ex.: +5511999998888). */
export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

/**
 * Normaliza o QR code do TOTP para uso em `<img src>`. O backend pode devolver
 * um data-URI, uma URL, ou apenas o base64 cru do PNG — este último é prefixado.
 */
export function toQrSrc(qr: string): string {
  if (qr.startsWith("data:") || qr.startsWith("http")) return qr;
  return `data:image/png;base64,${qr}`;
}
