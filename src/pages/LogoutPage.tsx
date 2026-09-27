import { useEffect } from "react";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/api/client";

/** Base da API do ArthosMFA (mesmo default do client). */
const API_BASE = import.meta.env.VITE_AUTH_API_URL || "https://localhost:5201";

/**
 * Logout COMPLETO, usável pelo próprio Portal e por apps externos (ex.: ClearID)
 * que naveguem para <code>/logout</code>:
 *   1. Limpa o token local do Portal (localStorage) — encerra a sessão do portalargus.
 *   2. Apaga o cookie SSO <code>rmtecho_token</code> (.rmtecho.com.br) via API do Portal.
 *   3. Cai na tela de login — sempre, independentemente de já haver login.
 */
export function LogoutPage() {
  useEffect(() => {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      /* ignore */
    }

    const returnUrl = `${window.location.origin}/login`;
    // Navegação de topo: a API apaga o cookie e redireciona de volta ao /login.
    window.location.replace(
      `${API_BASE.replace(/\/+$/, "")}/api/Auth/logout?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }, []);

  return null;
}
