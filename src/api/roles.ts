import { apiClient } from "./client";
import type { RoleDto } from "./types";

export async function listRoles(): Promise<RoleDto[]> {
  const { data } = await apiClient.get<RoleDto[]>("/api/roles");
  return data;
}
