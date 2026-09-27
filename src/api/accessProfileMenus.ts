import { apiClient } from "./client";
import type { AccessProfileMenuDto, SetProfileMenusRequest } from "./types";

/**
 * Permissões de menu por perfil de acesso.
 *
 * O contrato é (menuKey → select/insert/update/delete). Cada aplicativo define
 * seu próprio catálogo de menus (ex.: no ClearID: "identities", "empresas");
 * o admin escolhe quais dessas chaves cada perfil enxerga/manipula.
 *
 * `PUT` funciona como substituição: envia a lista COMPLETA — menus omitidos são
 * removidos, novos são adicionados, existentes são atualizados.
 */

export async function listProfileMenus(profileId: number): Promise<AccessProfileMenuDto[]> {
  const { data } = await apiClient.get<AccessProfileMenuDto[]>(
    `/api/access-profiles/${profileId}/menus`,
  );
  return data;
}

export async function setProfileMenus(
  profileId: number,
  payload: SetProfileMenusRequest,
): Promise<AccessProfileMenuDto[]> {
  const { data } = await apiClient.put<AccessProfileMenuDto[]>(
    `/api/access-profiles/${profileId}/menus`,
    payload,
  );
  return data;
}
