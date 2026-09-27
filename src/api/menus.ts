import { apiClient } from "./client";
import type {
  CreateMenuRequest,
  MenuDto,
  MenuTreeNodeDto,
  UpdateMenuRequest,
} from "./types";

/** CRUD do catálogo hierárquico de menus, escopado por aplicativo. */

export async function listAppMenus(
  appId: number,
  includeInactive = false,
): Promise<MenuDto[]> {
  const { data } = await apiClient.get<MenuDto[]>(
    `/api/applications/${appId}/menus`,
    { params: { includeInactive } },
  );
  return data;
}

/** Árvore aninhada (só ativos). Ordena por displayOrder → displayName. */
export async function listAppMenusTree(appId: number): Promise<MenuTreeNodeDto[]> {
  const { data } = await apiClient.get<MenuTreeNodeDto[]>(
    `/api/applications/${appId}/menus/tree`,
  );
  return data;
}

export async function createMenu(
  appId: number,
  payload: CreateMenuRequest,
): Promise<MenuDto> {
  const { data } = await apiClient.post<MenuDto>(
    `/api/applications/${appId}/menus`,
    payload,
  );
  return data;
}

export async function updateMenu(id: number, payload: UpdateMenuRequest): Promise<MenuDto> {
  const { data } = await apiClient.put<MenuDto>(`/api/menus/${id}`, payload);
  return data;
}

export async function deleteMenu(id: number): Promise<void> {
  await apiClient.delete(`/api/menus/${id}`);
}
