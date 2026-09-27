import { apiClient } from "./client";
import type {
  AccessProfileDto,
  CreateAccessProfileRequest,
  UpdateAccessProfileRequest,
} from "./types";

/** Perfis de acesso de uma aplicação. */
export async function listAppProfiles(
  appId: number,
  includeInactive = false,
): Promise<AccessProfileDto[]> {
  const { data } = await apiClient.get<AccessProfileDto[]>(
    `/api/applications/${appId}/profiles`,
    { params: { includeInactive } },
  );
  return data;
}

export async function createAppProfile(
  appId: number,
  payload: CreateAccessProfileRequest,
): Promise<AccessProfileDto> {
  const { data } = await apiClient.post<AccessProfileDto>(
    `/api/applications/${appId}/profiles`,
    payload,
  );
  return data;
}

export async function updateAccessProfile(
  profileId: number,
  payload: UpdateAccessProfileRequest,
): Promise<AccessProfileDto> {
  const { data } = await apiClient.put<AccessProfileDto>(
    `/api/access-profiles/${profileId}`,
    payload,
  );
  return data;
}

/** Desativa o perfil (soft delete). */
export async function deactivateAccessProfile(profileId: number): Promise<void> {
  await apiClient.delete(`/api/access-profiles/${profileId}`);
}

/**
 * Exclui o perfil permanentemente. Só é permitido para perfis já inativos e
 * sem vínculos usuário↔app. Se ainda houver bloqueadores, o backend responde
 * 409 e a exceção do axios carrega a lista em `response.data.blockers`.
 */
export async function hardDeleteAccessProfile(profileId: number): Promise<void> {
  await apiClient.delete(`/api/access-profiles/${profileId}`, {
    params: { hard: true },
  });
}
