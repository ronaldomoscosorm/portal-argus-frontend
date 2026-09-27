import { apiClient } from "./client";
import type {
  ApplicationDto,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from "./types";

export async function listApplications(includeInactive = false): Promise<ApplicationDto[]> {
  const { data } = await apiClient.get<ApplicationDto[]>("/api/applications", {
    params: { includeInactive },
  });
  return data;
}

export async function getApplication(id: number): Promise<ApplicationDto> {
  const { data } = await apiClient.get<ApplicationDto>(`/api/applications/${id}`);
  return data;
}

export async function createApplication(
  payload: CreateApplicationRequest,
): Promise<ApplicationDto> {
  const { data } = await apiClient.post<ApplicationDto>("/api/applications", payload);
  return data;
}

export async function updateApplication(
  id: number,
  payload: UpdateApplicationRequest,
): Promise<ApplicationDto> {
  const { data } = await apiClient.put<ApplicationDto>(`/api/applications/${id}`, payload);
  return data;
}

/** Desativa a aplicação (soft delete). */
export async function deactivateApplication(id: number): Promise<void> {
  await apiClient.delete(`/api/applications/${id}`);
}
