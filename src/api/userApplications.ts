import { apiClient } from "./client";
import type {
  ApplicationUserDto,
  AssignUserApplicationRequest,
  ChangeUserApplicationProfileRequest,
  UserApplicationDto,
} from "./types";

/** Apps + perfil concedidos a um usuário. */
export async function listByUser(userId: number): Promise<UserApplicationDto[]> {
  const { data } = await apiClient.get<UserApplicationDto[]>(
    `/api/userapplications/by-user/${userId}`,
  );
  return data;
}

/** Usuários + perfil que têm acesso a uma aplicação. */
export async function listByApplication(appId: number): Promise<ApplicationUserDto[]> {
  const { data } = await apiClient.get<ApplicationUserDto[]>(
    `/api/userapplications/by-application/${appId}`,
  );
  return data;
}

export async function grantAccess(
  payload: AssignUserApplicationRequest,
): Promise<void> {
  await apiClient.post("/api/userapplications", payload);
}

export async function changeProfile(
  userId: number,
  appId: number,
  payload: ChangeUserApplicationProfileRequest,
): Promise<void> {
  await apiClient.put(`/api/userapplications/${userId}/${appId}/profile`, payload);
}

export async function revokeAccess(userId: number, appId: number): Promise<void> {
  await apiClient.delete(`/api/userapplications/${userId}/${appId}`);
}
