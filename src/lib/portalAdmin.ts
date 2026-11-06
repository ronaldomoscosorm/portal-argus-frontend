/**
 * Regra de acesso ao console de administração do Portal: o usuário precisa ter o
 * aplicativo `portal` concedido com o perfil `Administrator` (claim
 * `app_profiles` = `portal:Administrator`). A role global `Administrator` e os
 * perfis de administrador de outros aplicativos (ex.: `clearid:Administrator`)
 * não dão acesso ao console. Espelha `PortalAdminPolicy` da ArthosMFA.
 */
import type { MeDto } from "@/api/types";
import { decodeJwtPayload } from "@/lib/jwt";

export const PORTAL_APP_CODE = "portal";
export const PORTAL_ADMIN_PROFILE = "Administrator";
const APP_PROFILES_CLAIM = "app_profiles";
const PORTAL_ADMIN_CLAIM = `${PORTAL_APP_CODE}:${PORTAL_ADMIN_PROFILE}`.toLowerCase();

function profileName(profile: unknown): string | null {
  if (typeof profile === "string") return profile;
  if (profile && typeof profile === "object" && "name" in profile) {
    const name = (profile as { name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

/** Verdadeiro se o usuário (GET /api/me) é administrador do Portal. */
export function isPortalAdminUser(user: MeDto | null | undefined): boolean {
  return (
    user?.apps?.some(
      (app) =>
        app.code?.toLowerCase() === PORTAL_APP_CODE &&
        profileName(app.profile)?.toLowerCase() === PORTAL_ADMIN_PROFILE.toLowerCase(),
    ) ?? false
  );
}

/** Verdadeiro se o JWT carrega a claim `app_profiles` = `portal:Administrator`. */
export function tokenIsPortalAdmin(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const raw = payload[APP_PROFILES_CLAIM] as string | string[] | undefined;
  if (!raw) return false;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.some((v) => typeof v === "string" && v.toLowerCase() === PORTAL_ADMIN_CLAIM);
}
