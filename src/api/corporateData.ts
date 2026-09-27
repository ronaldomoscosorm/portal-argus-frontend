import { apiClient } from "./client";
import type { CorporateClientDto, CorporateSiteDto } from "./types";

/**
 * Consultas ao CorporateData (via proxy do BFF).
 *
 * O BFF encaminha ao endpoint público `https://corporatedata.rmtecho.com.br/api/…`
 * repassando o Bearer do admin logado. As formas dos campos (nome/razaoSocial/…)
 * são tolerantes — o CorporateData retorna JSON livre e a UI escolhe o rótulo
 * mais amigável disponível.
 */

export async function listCorporateClients(): Promise<CorporateClientDto[]> {
  const { data } = await apiClient.get<CorporateClientDto[]>("/api/corporatedata/clientes");
  return data;
}

export async function listCorporateClientSites(clientId: number): Promise<CorporateSiteDto[]> {
  const { data } = await apiClient.get<CorporateSiteDto[]>(
    `/api/corporatedata/clientes/${clientId}/sites`,
  );
  return data;
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
