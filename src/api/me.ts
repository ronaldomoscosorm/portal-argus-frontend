import { apiClient } from "./client";
import type { MeDto, MeMfaDto, UpdateMeMfaRequest } from "./types";

export async function fetchMe(): Promise<MeDto> {
  const { data } = await apiClient.get<MeDto>("/api/Me");
  return data;
}

export async function fetchMeMfa(): Promise<MeMfaDto> {
  const { data } = await apiClient.get<MeMfaDto>("/api/Me/mfa");
  return data;
}

export async function updateMeMfa(payload: UpdateMeMfaRequest): Promise<MeMfaDto> {
  const { data } = await apiClient.put<MeMfaDto>("/api/Me/mfa", payload);
  return data;
}
