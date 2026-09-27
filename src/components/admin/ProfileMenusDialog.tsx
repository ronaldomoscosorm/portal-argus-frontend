import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { listAppMenusTree } from "@/api/menus";
import { listProfileMenus, setProfileMenus } from "@/api/accessProfileMenus";
import { toApiErrorMessage } from "@/api/client";
import type { AccessProfileMenuDto, MenuTreeNodeDto } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState, InlineLoader } from "@/components/PageState";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number;
  profileId: number;
  profileName: string;
}

type Perms = {
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
};

const zero: Perms = { select: false, insert: false, update: false, delete: false };

/**
 * Dialog para atribuir/desatribuir menus a um perfil de acesso.
 *
 * Fonte da lista: catálogo de menus do próprio aplicativo (Menu.Code === MenuKey).
 * O admin marca a visibilidade (checkbox principal do menu) e, opcionalmente,
 * as ações CRUD por menu (4 switches). Menus desmarcados são removidos do
 * mapa de permissões — o app cliente esconde da UI.
 *
 * O submit usa PUT `/api/access-profiles/{id}/menus` (substituição total).
 */
export function ProfileMenusDialog({
  open,
  onOpenChange,
  applicationId,
  profileId,
  profileName,
}: Props) {
  const queryClient = useQueryClient();

  const treeQuery = useQuery({
    queryKey: ["app-menus-tree", applicationId],
    queryFn: () => listAppMenusTree(applicationId),
    enabled: open,
  });

  const permsQuery = useQuery({
    queryKey: ["profile-menus", profileId],
    queryFn: () => listProfileMenus(profileId),
    enabled: open,
  });

  const [state, setState] = useState<Record<string, Perms>>({});
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Popula o state local a partir das permissões do servidor no open/refresh.
  useEffect(() => {
    if (!permsQuery.data) return;
    const next: Record<string, Perms> = {};
    for (const p of permsQuery.data) {
      next[p.menuKey] = {
        select: p.select,
        insert: p.insert,
        update: p.update,
        delete: p.delete,
      };
    }
    setState(next);
  }, [permsQuery.data]);

  useEffect(() => {
    if (!open) setCollapsed(new Set());
  }, [open]);

  const toggleExpand = (id: number) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isChecked = (code: string): boolean => Boolean(state[code]?.select);

  const isPerm = (code: string, k: keyof Perms): boolean => Boolean(state[code]?.[k]);

  /**
   * Alterna a visibilidade (select) de um menu e propaga a mudança pra árvore
   * filha, casando com a intuição do usuário: marcar um pai libera os filhos,
   * desmarcar retira todos (não bloqueia — só deixa fora do payload).
   */
  const toggleVisible = (node: MenuTreeNodeDto, checked: boolean) => {
    setState((s) => {
      const next = { ...s };
      const apply = (n: MenuTreeNodeDto) => {
        if (checked) {
          next[n.code] = { ...(next[n.code] ?? zero), select: true };
        } else {
          delete next[n.code];
        }
        for (const c of n.children) apply(c);
      };
      apply(node);
      return next;
    });
  };

  const setPerm = (code: string, k: keyof Perms, v: boolean) => {
    setState((s) => {
      const prev = s[code] ?? zero;
      // Ligar qualquer permissão CRUD implica select (não faz sentido sem ver).
      const nextRow: Perms = { ...prev, [k]: v };
      if (v && k !== "select") nextRow.select = true;
      return { ...s, [code]: nextRow };
    });
  };

  /**
   * Marca todos os menus da árvore. Se `withCrud` for true, liga também as 4
   * permissões CRUD; caso contrário, só visibilidade (select).
   */
  const selectAll = (withCrud: boolean) => {
    setState(() => {
      const next: Record<string, Perms> = {};
      const walk = (n: MenuTreeNodeDto) => {
        next[n.code] = withCrud
          ? { select: true, insert: true, update: true, delete: true }
          : { select: true, insert: false, update: false, delete: false };
        for (const c of n.children) walk(c);
      };
      for (const root of tree) walk(root);
      return next;
    });
  };

  /** Zera todas as permissões (menus somem do payload → sem acesso). */
  const clearAll = () => setState({});

  const save = useMutation({
    mutationFn: () => {
      // Só menus com select=true entram (o backend interpreta "ausente" = sem acesso).
      const menus: AccessProfileMenuDto[] = Object.entries(state)
        .filter(([, p]) => p.select)
        .map(([menuKey, p]) => ({ menuKey, ...p }));
      return setProfileMenus(profileId, { menus });
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["profile-menus", profileId], data);
      toast.success("Menus atualizados.");
      onOpenChange(false);
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Falha ao salvar os menus.")),
  });

  const selectedCount = useMemo(
    () => Object.values(state).filter((p) => p.select).length,
    [state],
  );

  const tree = treeQuery.data ?? [];
  const loading = treeQuery.isLoading || permsQuery.isLoading;
  const emptyCatalog = !loading && tree.length === 0;

  const renderNode = (node: MenuTreeNodeDto, depth: number) => {
    const hasChildren = node.children.length > 0;
    const expanded = !collapsed.has(node.id);
    const checked = isChecked(node.code);

    return (
      <div key={node.id} className="border-b border-border last:border-b-0">
        <div
          className={cn(
            "flex items-center gap-2 py-2 pr-3",
            "hover:bg-muted/40",
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-black/10"
              title={expanded ? "Recolher" : "Expandir"}
              aria-label={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="inline-block w-[18px]" aria-hidden="true" />
          )}

          <input
            type="checkbox"
            id={`menu-${node.id}`}
            checked={checked}
            onChange={(e) => toggleVisible(node, e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
          />

          <label
            htmlFor={`menu-${node.id}`}
            className="flex-1 cursor-pointer select-none text-sm"
          >
            {node.displayName}
            <span className="ml-2 font-mono text-xs text-muted-foreground">{node.code}</span>
          </label>

          {/* Switches CRUD só quando o menu está marcado. */}
          {checked && (
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1" title="Cadastrar">
                <Switch
                  checked={isPerm(node.code, "insert")}
                  onCheckedChange={(v) => setPerm(node.code, "insert", v)}
                />
                <span>Cadastrar</span>
              </label>
              <label className="flex items-center gap-1" title="Alterar">
                <Switch
                  checked={isPerm(node.code, "update")}
                  onCheckedChange={(v) => setPerm(node.code, "update", v)}
                />
                <span>Alterar</span>
              </label>
              <label className="flex items-center gap-1" title="Remover">
                <Switch
                  checked={isPerm(node.code, "delete")}
                  onCheckedChange={(v) => setPerm(node.code, "delete", v)}
                />
                <span>Remover</span>
              </label>
            </div>
          )}
        </div>

        {hasChildren && expanded && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !save.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Menus do perfil — {profileName}</DialogTitle>
          <DialogDescription>
            Marque os menus que este perfil deve enxergar no aplicativo. Ligue as ações
            CRUD por menu conforme o perfil deve poder cadastrar, alterar ou remover
            registros naquela tela.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <InlineLoader />
        ) : emptyCatalog ? (
          <EmptyState
            title="Sem catálogo de menus"
            description="Cadastre os menus deste aplicativo primeiro (na aba Menus). Sem catálogo, não há como atribuir permissões."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 text-xs">
              <span className="text-muted-foreground">Ações rápidas:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectAll(false)}
              >
                Marcar todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectAll(true)}
              >
                Marcar todos + CRUD
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAll}
              >
                Desmarcar todos
              </Button>
            </div>
            <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
              {tree.map((n) => renderNode(n, 0))}
            </div>
          </>
        )}

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedCount} menu{selectedCount === 1 ? "" : "s"} selecionado{selectedCount === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              onClick={() => save.mutate()}
              disabled={save.isPending || loading || emptyCatalog}
            >
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
