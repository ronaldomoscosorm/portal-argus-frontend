import { apiClient } from "./client";
import type {
  ClearIdSiteDto,
  SetUserSitesRequest,
  UserSiteDto,
} from "./types";

/**
 * Vínculos site (ClearID) ↔ usuário. Refletidos no JWT pela claim
 * `argus_sites` (formato `clientCode:siteCode`).
 */

export async function listUserSites(userId: number): Promise<UserSiteDto[]> {
  const { data } = await apiClient.get<UserSiteDto[]>(`/api/users/${userId}/sites`);
  return data;
}

/** Substitui a lista completa de sites (bulk set). */
export async function setUserSites(
  userId: number,
  payload: SetUserSitesRequest,
): Promise<UserSiteDto[]> {
  const { data } = await apiClient.put<UserSiteDto[]>(
    `/api/users/${userId}/sites`,
    payload,
  );
  return data;
}

/** Lista os sites do tenant do ClearID (pra popular dropdown de atribuição). */
export async function listClearIdSites(params?: {
  name?: string;
  accountId?: string;
}): Promise<ClearIdSiteDto[]> {
  const { data } = await apiClient.get<ClearIdSiteDto[]>("/api/clearid/sites", {
    params,
  });
  return data;
}
