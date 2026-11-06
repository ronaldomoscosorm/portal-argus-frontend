import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  SITE_SCOPE_LABELS,
  deactivateCorporateSite,
  getCorporateClient,
  isClearIdSite,
  listCorporateClientSites,
} from "@/api/corporateData";
import type { CorporateSiteDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ClienteFormDialog } from "@/components/admin/ClienteFormDialog";
import { SiteFormDialog } from "@/components/admin/SiteFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ClienteDetailPage() {
  const { id } = useParams();
  const clienteId = Number(id);
  const queryClient = useQueryClient();
  const [clienteFormOpen, setClienteFormOpen] = useState(false);
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CorporateSiteDto | null>(null);
  const [toDeactivate, setToDeactivate] = useState<CorporateSiteDto | null>(null);

  const clienteQuery = useQuery({
    queryKey: ["corporate-client", clienteId],
    queryFn: () => getCorporateClient(clienteId),
    enabled: Number.isFinite(clienteId),
  });
  const sitesQuery = useQuery({
    queryKey: ["corporate-sites", clienteId, { includeInactive: true }],
    queryFn: () => listCorporateClientSites(clienteId, true),
    enabled: Number.isFinite(clienteId),
  });

  const deactivate = useMutation({
    mutationFn: (siteId: number) => deactivateCorporateSite(siteId),
    onSuccess: async () => {
      toast.success("Site desativado.");
      await queryClient.invalidateQueries({ queryKey: ["corporate-sites"] });
      await queryClient.invalidateQueries({ queryKey: ["corporate-clients"] });
      await queryClient.invalidateQueries({ queryKey: ["corporate-client", clienteId] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível desativar.")),
  });

  const openCreateSite = () => {
    setEditingSite(null);
    setSiteFormOpen(true);
  };
  const openEditSite = (site: CorporateSiteDto) => {
    setEditingSite(site);
    setSiteFormOpen(true);
  };

  const cliente = clienteQuery.data;
  const sites = sitesQuery.data;

  return (
    <AdminLayout
      title={cliente?.name ?? "Cliente"}
      description="Dados do cliente e seus sites no catálogo corporativo."
      actions={
        <Button variant="outline" asChild>
          <Link to="/admin/clientes">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      {clienteQuery.isLoading ? (
        <InlineLoader />
      ) : clienteQuery.isError || !cliente ? (
        <ErrorState onRetry={() => clienteQuery.refetch()} />
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {cliente.name}
                  {cliente.isActive ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="muted">Inativo</Badge>
                  )}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cliente.code}</code>
                  {cliente.externalAccountId && (
                    <>
                      {" "}
                      · AccountId ClearID{" "}
                      <span className="font-mono text-xs">{cliente.externalAccountId}</span>
                    </>
                  )}
                </p>
              </div>
              <Button variant="outline" onClick={() => setClienteFormOpen(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </CardHeader>
          </Card>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Sites</h2>
            <Button variant="brand" onClick={openCreateSite}>
              <Plus className="h-4 w-4" /> Novo site
            </Button>
          </div>

          {sitesQuery.isLoading ? (
            <InlineLoader />
          ) : sitesQuery.isError ? (
            <ErrorState onRetry={() => sitesQuery.refetch()} />
          ) : !sites || sites.length === 0 ? (
            <EmptyState
              title="Nenhum site cadastrado"
              description="Cadastre um site ou sincronize o cliente com o ClearID."
            />
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-24">Sigla</TableHead>
                    <TableHead className="w-40">Apelido</TableHead>
                    <TableHead>Identificador externo</TableHead>
                    <TableHead className="w-28">Origem</TableHead>
                    <TableHead className="w-44">Escopo</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        {site.name}
                        {site.description && (
                          <p className="text-xs font-normal text-muted-foreground">
                            {site.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{site.sigla || "—"}</TableCell>
                      <TableCell>{site.apelido || "—"}</TableCell>
                      <TableCell className="max-w-[18rem] truncate font-mono text-xs text-muted-foreground">
                        {site.externalId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{isClearIdSite(site) ? "ClearID" : "Manual"}</Badge>
                      </TableCell>
                      <TableCell>{SITE_SCOPE_LABELS[site.scope ?? "All"] ?? site.scope}</TableCell>
                      <TableCell>
                        {site.isActive ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="muted">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSite(site)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {site.isActive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDeactivate(site)}
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

          <ClienteFormDialog
            open={clienteFormOpen}
            onOpenChange={setClienteFormOpen}
            cliente={cliente}
          />
          <SiteFormDialog
            open={siteFormOpen}
            onOpenChange={setSiteFormOpen}
            clienteId={clienteId}
            site={editingSite}
          />
          <ConfirmDialog
            open={Boolean(toDeactivate)}
            onOpenChange={(v) => !v && setToDeactivate(null)}
            title="Desativar site"
            description={`Desativar "${toDeactivate?.name}"? Ele deixará de aparecer nas listas dos aplicativos. É possível reativar depois editando o site.`}
            confirmLabel="Desativar"
            onConfirm={async () => {
              if (toDeactivate) await deactivate.mutateAsync(toDeactivate.id);
              setToDeactivate(null);
            }}
          />
        </>
      )}
    </AdminLayout>
  );
}
