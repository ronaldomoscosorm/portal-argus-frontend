import { apiClient } from "./client";
import type {
  AssignRoleRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
} from "./types";

export async function listUsers(): Promise<UserDto[]> {
  const { data } = await apiClient.get<UserDto[]>("/api/users");
  return data;
}

export async function getUser(id: number): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>(`/api/users/${id}`);
  return data;
}

export async function createUser(payload: CreateUserRequest): Promise<UserDto> {
  const { data } = await apiClient.post<UserDto>("/api/users", payload);
  return data;
}

export async function updateUser(
  id: number,
  payload: UpdateUserRequest,
): Promise<UserDto> {
  const { data } = await apiClient.put<UserDto>(`/api/users/${id}`, payload);
  return data;
}

export async function assignRole(
  userId: number,
  payload: AssignRoleRequest,
): Promise<void> {
  await apiClient.post(`/api/users/${userId}/roles`, payload);
}

/**
 * Desatribui uma role global do usuário. Backend recusa com 409 se for a
 * última role Administrator do sistema.
 */
export async function unassignRole(userId: number, roleName: string): Promise<void> {
  await apiClient.delete(`/api/users/${userId}/roles/${encodeURIComponent(roleName)}`);
}

/**
 * Envia por e-mail um link para o usuário definir uma nova senha.
 * Endpoint restrito a admin no backend; 502 se o disparo do e-mail falhar.
 */
export async function sendPasswordResetLink(userId: number): Promise<void> {
  await apiClient.post(`/api/users/${userId}/send-password-reset-link`);
}
