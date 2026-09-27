import { apiClient } from "./client";
import type {
  ApplicationSiteDto,
  SetApplicationSitesRequest,
} from "./types";

/**
 * Vínculos aplicação ↔ sites do CorporateData. PUT é substituição total: envia
 * a lista completa; pares (clientId, siteId) ausentes são removidos, novos são
 * adicionados, existentes ficam.
 */

export async function listApplicationSites(appId: number): Promise<ApplicationSiteDto[]> {
  const { data } = await apiClient.get<ApplicationSiteDto[]>(
    `/api/applications/${appId}/sites`,
  );
  return data;
}

export async function setApplicationSites(
  appId: number,
  payload: SetApplicationSitesRequest,
): Promise<ApplicationSiteDto[]> {
  const { data } = await apiClient.put<ApplicationSiteDto[]>(
    `/api/applications/${appId}/sites`,
    payload,
  );
  return data;
}
