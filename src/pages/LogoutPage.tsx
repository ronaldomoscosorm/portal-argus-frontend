import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { logoutSso } from "@/api/auth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/api/client";
import { isSafeReturnUrl } from "@/lib/jwt";

/**
 * Logout COMPLETO, usável pelo próprio Portal e por apps externos (ex.: ClearID)
 * que naveguem para <code>/logout</code>:
 *   1. Limpa o token local do Portal (localStorage) — encerra a sessão do portalargus.
 *   2. Apaga o cookie SSO via <code>POST /api/auth/logout</code> do BFF (o BFF não
 *      expõe GET — navegar direto para a URL devolve 405).
 *   3. Cai na tela de login — sempre, independentemente de já haver login.
 *
 * Aceita <code>?returnUrl=</code> (mesma validação do login): após o novo login,
 * o usuário volta ao app de origem (ex.: ClearID) em vez do dashboard.
 */
export function LogoutPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const login = new URL("/login", window.location.origin);
    const back = searchParams.get("returnUrl");
    if (isSafeReturnUrl(back)) login.searchParams.set("returnUrl", back!);

    void (async () => {
      await logoutSso();
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      window.location.replace(login.toString());
    })();
  }, [searchParams]);

  return null;
}
