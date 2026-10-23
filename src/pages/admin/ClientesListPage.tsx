import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { deactivateCorporateClient, listCorporateClients } from "@/api/corporateData";
import type { CorporateClientDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ClienteFormDialog } from "@/components/admin/ClienteFormDialog";
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

export function ClientesListPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CorporateClientDto | null>(null);
  const [toDeactivate, setToDeactivate] = useState<CorporateClientDto | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["corporate-clients", { includeInactive: true }],
    queryFn: () => listCorporateClients(true),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateCorporateClient(id),
    onSuccess: async () => {
      toast.success("Cliente desativado.");
      await queryClient.invalidateQueries({ queryKey: ["corporate-clients"] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível desativar.")),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (cliente: CorporateClientDto) => {
    setEditing(cliente);
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Clientes e sites"
      description="Catálogo corporativo de clientes e seus sites (CorporateData)."
      actions={
        <Button variant="brand" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      }
    >
      {isLoading ? (
        <InlineLoader />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastre o primeiro cliente para começar."
          action={
            <Button variant="brand" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>AccountId ClearID</TableHead>
                <TableHead className="w-28 text-center">Sites ativos</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/admin/clientes/${cliente.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {cliente.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cliente.code}</code>
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate font-mono text-xs text-muted-foreground">
                    {cliente.externalAccountId || "—"}
                  </TableCell>
                  <TableCell className="text-center">{cliente.siteCount ?? 0}</TableCell>
                  <TableCell>
                    {cliente.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="muted">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Sites do cliente">
                        <Link to={`/admin/clientes/${cliente.id}`}>
                          <MapPin className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cliente)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {cliente.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDeactivate(cliente)}
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

      <ClienteFormDialog open={formOpen} onOpenChange={setFormOpen} cliente={editing} />

      <ConfirmDialog
        open={Boolean(toDeactivate)}
        onOpenChange={(v) => !v && setToDeactivate(null)}
        title="Desativar cliente"
        description={`Desativar "${toDeactivate?.name}"? Ele deixará de aparecer nas listas dos aplicativos. É possível reativar depois editando o cliente. Clientes sincronizados do ClearID voltam a ficar ativos na próxima sincronização.`}
        confirmLabel="Desativar"
        onConfirm={async () => {
          if (toDeactivate) await deactivate.mutateAsync(toDeactivate.id);
          setToDeactivate(null);
        }}
      />
    </AdminLayout>
  );
}
