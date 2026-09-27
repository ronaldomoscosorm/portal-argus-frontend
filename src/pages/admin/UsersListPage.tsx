import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { listUsers } from "@/api/users";
import type { UserDto } from "@/api/types";
import { mfaMethodLabel } from "@/lib/labels";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UsersListPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

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
        <Button variant="brand" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
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
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-40">2FA</TableHead>
                <TableHead>Roles globais</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {u.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.userName}</TableCell>
                  <TableCell>
                    <Badge variant={u.mfaMethod === "None" ? "muted" : "secondary"}>
                      {mfaMethodLabel(u.mfaMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant={r === "Administrator" ? "brand" : "outline"}>
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
      )}

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
    </AdminLayout>
  );
}
