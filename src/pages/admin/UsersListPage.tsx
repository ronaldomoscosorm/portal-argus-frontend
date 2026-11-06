import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Mail,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { listUsers, sendPasswordResetLinks } from "@/api/users";
import { toApiErrorMessage } from "@/api/client";
import type { UserDto } from "@/api/types";
import { mfaMethodLabel } from "@/lib/labels";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "name" | "userName" | "mfaMethod" | "roles";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Nome" },
  { key: "userName", label: "E-mail" },
  { key: "mfaMethod", label: "2FA", className: "w-40" },
  { key: "roles", label: "Roles globais" },
];

const sortValue = (u: UserDto, key: SortKey): string => {
  switch (key) {
    case "name":
      return u.name ?? "";
    case "userName":
      return u.userName;
    case "mfaMethod":
      return mfaMethodLabel(u.mfaMethod);
    case "roles":
      return [...u.roles].sort().join(", ");
  }
};

export function UsersListPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: "name",
    asc: true,
  });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  // Pesquisa (nome, e-mail, telefone ou role) e ordenação feitas no cliente: a API devolve a lista inteira.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (data ?? []).filter(
      (u) =>
        !term ||
        [u.name ?? "", u.userName, u.phoneNumber ?? "", ...u.roles].some((v) =>
          v.toLowerCase().includes(term),
        ),
    );
    const collator = new Intl.Collator("pt-BR", {
      sensitivity: "base",
      numeric: true,
    });
    return filtered.sort((a, b) => {
      const cmp = collator.compare(
        sortValue(a, sort.key),
        sortValue(b, sort.key),
      );
      return (sort.asc ? cmp : -cmp) || a.id - b.id;
    });
  }, [data, search, sort]);

  // Seleção múltipla: o "selecionar todos" do cabeçalho age só sobre as linhas visíveis.
  const visibleIds = rows.map((u) => u.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));
  const toggleOne = (id: number, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleVisible = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const resetLinks = useMutation({
    mutationFn: () => sendPasswordResetLinks([...selected]),
    onSuccess: (res) => {
      const missing = res.notFound.length
        ? ` ${res.notFound.length} não encontrado(s).`
        : "";
      toast.success(
        `E-mail de senha agendado para ${res.queued} usuário(s).${missing}`,
      );
      setSelected(new Set());
    },
    onError: (err) =>
      toast.error(
        toApiErrorMessage(err, "Não foi possível agendar os e-mails."),
      ),
  });

  const sortBy = (key: SortKey) =>
    setSort((prev) => ({ key, asc: prev.key === key ? !prev.asc : true }));
  const sortIcon = (key: SortKey) =>
    sort.key !== key ? (
      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
    ) : sort.asc ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (u: UserDto) => {
    setEditing(u);
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Usuários"
      description="Gerencie usuários, 2FA, roles globais e vínculos com aplicativos."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/users/bulk">
              <Users className="h-4 w-4" /> Cadastro em lote
            </Link>
          </Button>
          <Button variant="brand" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <InlineLoader />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Cadastre o primeiro usuário do Portal Argus."
          action={
            <Button variant="brand" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo usuário
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                className="pl-8"
                placeholder="Pesquisar por nome, e-mail, telefone ou role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Pesquisar usuários"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {rows.length === data.length
                ? `${data.length} usuário(s)`
                : `${rows.length} de ${data.length} usuário(s)`}
            </span>
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selected.size} selecionado(s)
                </span>
                <Button
                  variant="outline"
                  onClick={() => setConfirmResetOpen(true)}
                  disabled={resetLinks.isPending}
                >
                  <Mail className="h-4 w-4" />
                  {resetLinks.isPending
                    ? "Agendando…"
                    : "Enviar e-mail de senha"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(new Set())}>
                  Limpar
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand"
                      aria-label="Selecionar todos os usuários visíveis"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            !allVisibleSelected && someVisibleSelected;
                      }}
                      onChange={(e) => toggleVisible(e.target.checked)}
                      disabled={visibleIds.length === 0}
                    />
                  </TableHead>
                  {COLUMNS.map((c) => (
                    <TableHead
                      key={c.key}
                      className={c.className}
                      aria-sort={
                        sort.key === c.key
                          ? sort.asc
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => sortBy(c.key)}
                        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                      >
                        {c.label}
                        {sortIcon(c.key)}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum usuário corresponde à pesquisa.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((u) => (
                  <TableRow
                    key={u.id}
                    data-state={selected.has(u.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand"
                        aria-label={`Selecionar ${u.name ?? u.userName}`}
                        checked={selected.has(u.id)}
                        onChange={(e) => toggleOne(u.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {u.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.userName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.mfaMethod === "None" ? "muted" : "secondary"}
                      >
                        {mfaMethodLabel(u.mfaMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={
                                r === "Administrator" ? "brand" : "outline"
                              }
                            >
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(u)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
      />

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Enviar e-mail de senha"
        description={`${selected.size} usuário(s) receberá(ão) um e-mail com o link para definir a senha. O envio acontece em segundo plano.`}
        confirmLabel="Enviar"
        destructive={false}
        onConfirm={() =>
          resetLinks.mutateAsync().then(
            () => undefined,
            () => undefined,
          )
        }
      />
    </AdminLayout>
  );
}
