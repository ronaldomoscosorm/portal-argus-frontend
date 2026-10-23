import { apiClient } from "./client";
import type {
  CorporateClientDto,
  CorporateSiteDto,
  CorporateSiteScope,
  CreateCorporateClientRequest,
  CreateCorporateSiteRequest,
  UpdateCorporateClientRequest,
  UpdateCorporateSiteRequest,
} from "./types";

/**
 * Consultas ao CorporateData (via proxy do BFF).
 *
 * O BFF encaminha ao endpoint público `https://corporatedata.rmtecho.com.br/api/…`
 * repassando o Bearer do admin logado. As formas dos campos (nome/razaoSocial/…)
 * são tolerantes — o CorporateData retorna JSON livre e a UI escolhe o rótulo
 * mais amigável disponível.
 */

export async function listCorporateClients(includeInactive = false): Promise<CorporateClientDto[]> {
  const { data } = await apiClient.get<CorporateClientDto[]>("/api/corporatedata/clientes", {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  return data;
}

export async function getCorporateClient(id: number): Promise<CorporateClientDto> {
  const { data } = await apiClient.get<CorporateClientDto>(`/api/corporatedata/clientes/${id}`);
  return data;
}

export async function createCorporateClient(
  payload: CreateCorporateClientRequest,
): Promise<CorporateClientDto> {
  const { data } = await apiClient.post<CorporateClientDto>("/api/corporatedata/clientes", payload);
  return data;
}

export async function updateCorporateClient(
  id: number,
  payload: UpdateCorporateClientRequest,
): Promise<CorporateClientDto> {
  const { data } = await apiClient.put<CorporateClientDto>(
    `/api/corporatedata/clientes/${id}`,
    payload,
  );
  return data;
}

/** Desativa o cliente (soft delete). */
export async function deactivateCorporateClient(id: number): Promise<void> {
  await apiClient.delete(`/api/corporatedata/clientes/${id}`);
}

export async function listCorporateClientSites(
  clientId: number,
  includeInactive = false,
): Promise<CorporateSiteDto[]> {
  const { data } = await apiClient.get<CorporateSiteDto[]>(
    `/api/corporatedata/clientes/${clientId}/sites`,
    { params: includeInactive ? { includeInactive: true } : undefined },
  );
  return data;
}

export async function createCorporateSite(
  payload: CreateCorporateSiteRequest,
): Promise<CorporateSiteDto> {
  const { data } = await apiClient.post<CorporateSiteDto>("/api/corporatedata/sites", payload);
  return data;
}

export async function updateCorporateSite(
  id: number,
  payload: UpdateCorporateSiteRequest,
): Promise<CorporateSiteDto> {
  const { data } = await apiClient.put<CorporateSiteDto>(`/api/corporatedata/sites/${id}`, payload);
  return data;
}

/** Desativa o site (soft delete). */
export async function deactivateCorporateSite(id: number): Promise<void> {
  await apiClient.delete(`/api/corporatedata/sites/${id}`);
}

/** Rótulos dos escopos de site. */
export const SITE_SCOPE_LABELS: Record<CorporateSiteScope, string> = {
  All: "Todos",
  ClearIdOnly: "Somente ClearID",
  ClientesOnly: "Somente Clientes",
  AplicativosOnly: "Somente Aplicativos",
};

/** Site espelhado do ClearID (identificador externo = GUID do siteId). */
export function isClearIdSite(s: CorporateSiteDto): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.externalId ?? "");
}

/** Rótulo amigável do cliente, escolhido entre os campos disponíveis (PT/EN). */
export function clientLabel(c: CorporateClientDto): string {
  return (
    c.nomeFantasia?.trim() ||
    c.razaoSocial?.trim() ||
    c.name?.trim() ||
    c.nome?.trim() ||
    c.description?.trim() ||
    c.descricao?.trim() ||
    `Cliente ${c.id}`
  );
}

/** Rótulo amigável do site (PT/EN). */
export function siteLabel(s: CorporateSiteDto): string {
  return (
    s.name?.trim() ||
    s.nome?.trim() ||
    s.description?.trim() ||
    s.descricao?.trim() ||
    `Site ${s.id}`
  );
}
