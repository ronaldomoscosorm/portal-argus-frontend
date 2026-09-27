import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import {
  createMenu,
  deleteMenu,
  listAppMenus,
  updateMenu,
} from "@/api/menus";
import { toApiErrorMessage } from "@/api/client";
import type { CreateMenuRequest, MenuDto, UpdateMenuRequest } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  applicationId: number;
}

const NONE_PARENT = "__none__";

interface TreeRow extends MenuDto {
  depth: number;
}

/**
 * Achata a lista plana em ordem de árvore (pais primeiro, depois filhos indentados).
 * Ordena por displayOrder → displayName em cada nível.
 */
function flattenTree(all: MenuDto[]): TreeRow[] {
  const children = new Map<number | null, MenuDto[]>();
  for (const m of all) {
    const key = (m.parentMenuId ?? null) as number | null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(m);
  }
  for (const arr of children.values()) {
    arr.sort((a, b) => a.displayOrder - b.displayOrder || a.displayName.localeCompare(b.displayName));
  }
  const rows: TreeRow[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const m of children.get(parent) ?? []) {
      rows.push({ ...m, depth });
      walk(m.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export function AppMenusSection({ applicationId }: Props) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuDto | null>(null);
  const [toDelete, setToDelete] = useState<MenuDto | null>(null);

  const menusQuery = useQuery({
    queryKey: ["app-menus", applicationId, true],
    queryFn: () => listAppMenus(applicationId, true),
    enabled: Number.isFinite(applicationId),
  });

  const rows = useMemo(() => flattenTree(menusQuery.data ?? []), [menusQuery.data]);

  const remove = useMutation({
    mutationFn: (id: number) => deleteMenu(id),
    onSuccess: async () => {
      toast.success("Menu removido.");
      await queryClient.invalidateQueries({ queryKey: ["app-menus", applicationId] });
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const body = err.response.data as { message?: string } | undefined;
        toast.error(body?.message ?? "Não é possível remover este menu.");
        return;
      }
      toast.error(toApiErrorMessage(err, "Falha ao remover o menu."));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: MenuDto) => {
    setEditing(m);
    setFormOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Menus do aplicativo</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo dos menus deste app. Depois use o ícone de árvore em cada perfil
            para escolher quais menus ele enxerga.
          </p>
        </div>
        <Button variant="brand" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo menu
        </Button>
      </CardHeader>
      <CardContent>
        {menusQuery.isLoading ? (
          <InlineLoader />
        ) : menusQuery.isError ? (
          <ErrorState onRetry={() => menusQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhum menu cadastrado"
            description="Cadastre os menus do app para depois atribuí-los aos perfis."
            action={
              <Button variant="brand" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Novo menu
              </Button>
            }
          />
        ) : (
          <div className="rounded-lg border border-border">
            {rows.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-2 border-b border-border py-2 pr-3 last:border-b-0",
                  !r.isActive && "opacity-60",
                )}
                style={{ paddingLeft: `${12 + r.depth * 20}px` }}
              >
                {r.depth > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1 py-0.5">{r.code}</code>
                    {r.icon && <span className="ml-2">ícone: {r.icon}</span>}
                    <span className="ml-2">ordem: {r.displayOrder}</span>
                  </div>
                </div>
                {!r.isActive && <Badge variant="muted">Inativo</Badge>}
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setToDelete(r)}
                  title="Remover"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <MenuFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        applicationId={applicationId}
        menu={editing}
        existingMenus={menusQuery.data ?? []}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Remover menu"
        description={`Remover o menu "${toDelete?.displayName}"? Recusará se tiver submenus ou se já estiver atribuído a algum perfil.`}
        confirmLabel="Remover"
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Formulário (criar/editar)
// ---------------------------------------------------------------------------

interface FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number;
  menu: MenuDto | null;
  existingMenus: MenuDto[];
}

interface FormState {
  code: string;
  displayName: string;
  icon: string;
  parentMenuId: string;
  displayOrder: number;
  isActive: boolean;
}

const emptyForm: FormState = {
  code: "",
  displayName: "",
  icon: "",
  parentMenuId: NONE_PARENT,
  displayOrder: 0,
  isActive: true,
};

function MenuFormDialog({ open, onOpenChange, applicationId, menu, existingMenus }: FormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(menu);

  // Reset ao abrir/trocar de menu editado.
  useEffect(() => {
    if (!open) return;
    if (menu) {
      setForm({
        code: menu.code,
        displayName: menu.displayName,
        icon: menu.icon ?? "",
        parentMenuId: menu.parentMenuId ? String(menu.parentMenuId) : NONE_PARENT,
        displayOrder: menu.displayOrder,
        isActive: menu.isActive,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, menu]);

  // Pais candidatos: qualquer menu deste app menos o próprio menu e seus descendentes
  // (pra evitar ciclo). O backend também valida — aqui é só UX.
  const parentOptions = useMemo(() => {
    if (!menu) return existingMenus;
    const banned = new Set<number>([menu.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of existingMenus) {
        if (m.parentMenuId != null && banned.has(m.parentMenuId) && !banned.has(m.id)) {
          banned.add(m.id);
          changed = true;
        }
      }
    }
    return existingMenus.filter((m) => !banned.has(m.id));
  }, [menu, existingMenus]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateMenuRequest & UpdateMenuRequest = {
        code: form.code.trim(),
        displayName: form.displayName.trim(),
        icon: form.icon.trim() || null,
        parentMenuId: form.parentMenuId === NONE_PARENT ? null : Number(form.parentMenuId),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      return isEdit && menu ? updateMenu(menu.id, payload) : createMenu(applicationId, payload);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Menu atualizado." : "Menu criado.");
      await queryClient.invalidateQueries({ queryKey: ["app-menus", applicationId] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Falha ao salvar o menu.")),
  });

  const submit = () => {
    setError(null);
    if (!form.code.trim() || !form.displayName.trim()) {
      setError("Código e nome são obrigatórios.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar menu" : "Novo menu"}</DialogTitle>
          <DialogDescription>
            O <code>Código</code> é a chave que casa com as permissões salvas nos perfis
            — evite mudar depois de já ter atribuído aos perfis.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="menu-code">Código</Label>
            <Input
              id="menu-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="identities"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="menu-name">Nome</Label>
            <Input
              id="menu-name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Identidades"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Menu pai</Label>
            <Select
              value={form.parentMenuId}
              onValueChange={(v) => setForm((f) => ({ ...f, parentMenuId: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PARENT}>Nenhum (menu raiz)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="menu-icon">Ícone (opcional)</Label>
              <Input
                id="menu-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="users"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-order">Ordem</Label>
              <Input
                id="menu-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            Ativo
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
