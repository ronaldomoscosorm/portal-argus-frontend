import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { LoginResponse } from "./types";

/** Chaves de armazenamento dos tokens no localStorage. */
export const ACCESS_TOKEN_KEY = "portal:accessToken";
export const REFRESH_TOKEN_KEY = "portal:refreshToken";

const baseURL = import.meta.env.VITE_AUTH_API_URL || "https://localhost:5201";

/**
 * Envelope padrão de resposta do BFF (PortalArgus.Api): toda resposta vem
 * como `{ success, message, data, count, traceId }`; o payload real fica em `data`.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string | null;
  data: T | null;
  count: number | null;
  traceId: string | null;
}

/** Erro de negócio devolvido pelo BFF (envelope com success=false). */
export class ApiError extends Error {
  readonly traceId: string | null;
  readonly status?: number;
  constructor(message: string, traceId: string | null = null, status?: number) {
    super(message);
    this.name = "ApiError";
    this.traceId = traceId;
    this.status = status;
  }
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    "data" in body &&
    "traceId" in body
  );
}

/**
 * Detecta o envelope da ArthosMFA (`{ code:number, data:object, message:string }`).
 * O BFF deveria desembrulhar isso via `AuthGatewayService.UnwrapEnvelope`, mas se por
 * algum motivo escapa (BFF antigo em produção, ou requisição direta à ArthosMFA em dev),
 * o frontend faz o unwrap por defesa.
 */
function isArthosEnvelope(body: unknown): body is { code: number; data: unknown; message: string } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.code === "number" &&
    "data" in b &&
    (typeof b.message === "string" || b.message === null) &&
    // Distingue do envelope BFF (que também tem success + traceId).
    !("success" in b) &&
    !("traceId" in b)
  );
}

// Endpoints de auth cujo corpo (sucesso E falha) precisa ser lido pela tela —
// aqui NÃO lançamos em success=false; devolvemos o LoginResponse mesclado.
const AUTH_MERGE_SUFFIXES = ["/login", "/mfa/verify", "/refresh"];

/** Mescla o envelope de auth num LoginResponse plano (tolera ambos os formatos). */
function mergeAuth(env: ApiEnvelope<Partial<LoginResponse>>): LoginResponse {
  const d = (env.data ?? {}) as Partial<LoginResponse>;
  const top = env as unknown as Partial<LoginResponse>;
  return {
    success: env.success,
    message: env.message ?? d.message ?? null,
    mfaRequired: d.mfaRequired ?? top.mfaRequired ?? false,
    mfaMethod: d.mfaMethod ?? top.mfaMethod ?? null,
    mfaToken: d.mfaToken ?? top.mfaToken ?? null,
    qrCode: d.qrCode ?? top.qrCode ?? null,
    token: d.token ?? top.token ?? null,
    refreshToken: d.refreshToken ?? top.refreshToken ?? null,
  };
}

/**
 * Cliente axios único da SPA. Fala apenas com o BFF (PortalArgus.Api).
 * - Injeta `Authorization: Bearer <token>` em toda requisição.
 * - Desembrulha o envelope `{ success, message, data }`: `response.data` passa a
 *   ser o `data` já plano; em `success=false` (fora de auth) lança `ApiError`.
 * - Em 401 de endpoint protegido, limpa a sessão e volta para /login.
 */
export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
  // Essencial para o SSO: envia/recebe o cookie rmtecho_token nas chamadas
  // cross-origin (portalargus.rmtecho.com.br -> portal.rmtecho.com.br). Sem isso
  // o browser descarta o Set-Cookie da resposta de login.
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    let body = response.data;
    const url = (response.config.url ?? "").toLowerCase();
    const isAuth = AUTH_MERGE_SUFFIXES.some((s) => url.endsWith(s));

    if (isAuth) {
      // eslint-disable-next-line no-console
      console.log("[portal] response bruto do BFF", {
        url,
        status: response.status,
        bodyKeys: body && typeof body === "object" ? Object.keys(body) : typeof body,
        body,
      });
    }

    // Defesa: se o BFF passou o envelope da ArthosMFA cru (BFF antigo, ou request
    // direto à ArthosMFA), desembrulha aqui antes das demais transformações.
    if (isArthosEnvelope(body)) {
      // eslint-disable-next-line no-console
      console.log("[portal] envelope ArthosMFA detectado — desembrulhando", body);
      body = body.data;
      response.data = body;
    }

    if (isEnvelope(body)) {
      if (isAuth) {
        response.data = mergeAuth(body as ApiEnvelope<Partial<LoginResponse>>);
        // eslint-disable-next-line no-console
        console.log("[portal] mergeAuth aplicado — LoginResponse final:", response.data);
      } else {
        if (!body.success) {
          throw new ApiError(
            body.message ?? "A operação não pôde ser concluída.",
            body.traceId,
            response.status,
          );
        }
        response.data = body.data;
      }
    } else if (isAuth) {
      // eslint-disable-next-line no-console
      console.log("[portal] body de auth NÃO é envelope BFF nem ArthosMFA — vai direto pra auth.ts", body);
    }
    return response;
  },
  (error: AxiosError) => {
    // eslint-disable-next-line no-console
    console.error("[portal] erro axios", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extrai uma mensagem amigável de um erro (axios, ApiError ou Error), sem vazar
 * stack trace. Usar nas telas para exibir toasts/erros em pt-BR.
 */
export function toApiErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro. Tente novamente.",
): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { message?: string; title?: string; error?: string }
      | string
      | undefined;
    if (typeof body === "string") {
      if (body.trim()) return body;
    } else if (body) {
      if (body.message) return body.message;
      if (body.title) return body.title;
      if (body.error) return body.error;
    }
    if (!error.response) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
