/**
 * Utilitários leves para JWT (decode sem validação de assinatura — a validação
 * é do backend) e para tratar o parâmetro ?returnUrl= usado no fluxo SSO.
 */

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

/** Decodifica o payload de um JWT (não valida assinatura — só leitura de claims). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Lista de roles do JWT. Tolera o claim vindo como string (uma role) ou
 * array (várias roles). ArthosMFA emite com o namespace de ClaimTypes.Role.
 */
export function getRolesFromToken(token: string | null | undefined): string[] {
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  const raw = (payload[ROLE_CLAIM] ?? payload["role"] ?? payload["roles"]) as
    | string
    | string[]
    | undefined;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Aceita apenas returnUrl "seguro":
 *   - path relativo começando com "/" (mesmo host — evita `//host` que é
 *     protocolo-relativo e permitiria redirect externo)
 *   - URL absoluta cujo hostname:
 *       - termina em `.rmtecho.com.br` (ou é ele mesmo) — apps de produção
 *       - é `localhost` ou `127.0.0.1` — apps em desenvolvimento local
 *         (não permite alcance externo: localhost sempre resolve na máquina
 *         do próprio usuário)
 *
 * Blindagem contra open-redirect: qualquer coisa fora dessas formas é
 * rejeitada e o LoginPage aplica a regra de pós-login padrão.
 */
export function isSafeReturnUrl(returnUrl: string | null | undefined): boolean {
  if (!returnUrl) return false;
  if (returnUrl.startsWith("//")) return false;
  if (returnUrl.startsWith("/")) return true;

  try {
    const url = new URL(returnUrl);
    const host = url.hostname.toLowerCase();
    if (host === "rmtecho.com.br" || host.endsWith(".rmtecho.com.br")) return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
    return false;
  } catch {
    return false;
  }
}
