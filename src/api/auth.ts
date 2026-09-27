import { apiClient } from "./client";
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  ResetPasswordWithCodeRequest,
  SendCodeRequest,
  VerifyMfaRequest,
} from "./types";

// Em falha de credencial/MFA a API responde 401 com um LoginResponse
// (success=false, message). Tratamos 401 como resposta válida para que o corpo
// flua para a tela — que decide pelo `success` — em vez de cair no catch genérico.
const acceptAuthFailure = (status: number) =>
  (status >= 200 && status < 300) || status === 401;

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/api/Auth/login", payload, {
    validateStatus: acceptAuthFailure,
  });
  return data;
}

export async function verifyMfa(payload: VerifyMfaRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/api/Auth/mfa/verify", payload, {
    validateStatus: acceptAuthFailure,
  });
  return data;
}

/** Dispara o envio de um OTP por e-mail/SMS na etapa de MFA do login. */
export async function sendMfaCode(payload: SendCodeRequest): Promise<void> {
  await apiClient.post("/api/Auth/mfa/send-code", payload);
}

export async function refreshSession(refreshToken: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    "/api/Auth/refresh",
    { refreshToken },
    { validateStatus: acceptAuthFailure },
  );
  return data;
}

/** Inicia o reset de senha; a API envia um código pelo canal escolhido. */
export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  await apiClient.post("/api/Auth/forgot-password", payload);
}

export async function resetPasswordWithCode(
  payload: ResetPasswordWithCodeRequest,
): Promise<void> {
  await apiClient.post("/api/Auth/reset-password-with-code", payload);
}

/** Redefine a senha usando o token JWT recebido pelo link do e-mail (fluxo admin). */
export async function resetPasswordWithToken(
  payload: ResetPasswordRequest,
): Promise<void> {
  await apiClient.post("/api/Auth/reset-password", payload);
}
