import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Pencil, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { deactivateApplication, listApplications } from "@/api/applications";
import type { ApplicationDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ApplicationFormDialog } from "@/components/admin/ApplicationFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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

export function AppsListPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationDto | null>(null);
  const [toDeactivate, setToDeactivate] = useState<ApplicationDto | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["applications", { includeInactive: true }],
    queryFn: () => listApplications(true),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateApplication(id),
    onSuccess: async () => {
      toast.success("Aplicativo desativado.");
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível desativar.")),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (app: ApplicationDto) => {
    setEditing(app);
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Aplicativos"
      description="Catálogo de aplicações gerenciadas pelo Portal Argus."
      actions={
        <Button variant="brand" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo app
        </Button>
      }
    >
      {isLoading ? (
        <InlineLoader />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhum aplicativo cadastrado"
          description="Cadastre o primeiro aplicativo para começar."
          action={
            <Button variant="brand" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo app
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-20 text-center">Ordem</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary text-sm font-bold text-primary-foreground">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        app.code.slice(0, 1).toUpperCase()
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/admin/apps/${app.id}`} className="hover:text-brand hover:underline">
                      {app.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{app.code}</code>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {app.url}
                  </TableCell>
                  <TableCell className="text-center">{app.displayOrder}</TableCell>
                  <TableCell>
                    {app.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="muted">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Perfis / detalhe">
                        <Link to={`/admin/apps/${app.id}`}>
                          <Settings2 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(app)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {app.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDeactivate(app)}
                          title="Desativar"
                          className="text-destructive"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center text-success">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} app={editing} />

      <ConfirmDialog
        open={Boolean(toDeactivate)}
        onOpenChange={(v) => !v && setToDeactivate(null)}
        title="Desativar aplicativo"
        description={`Desativar "${toDeactivate?.displayName}"? Ele deixará de aparecer para os usuários. É possível reativar depois editando o app.`}
        confirmLabel="Desativar"
        onConfirm={async () => {
          if (toDeactivate) await deactivate.mutateAsync(toDeactivate.id);
          setToDeactivate(null);
        }}
      />
    </AdminLayout>
  );
}
