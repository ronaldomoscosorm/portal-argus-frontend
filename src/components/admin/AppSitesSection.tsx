import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  listApplicationSites,
  setApplicationSites,
} from "@/api/applicationSites";
import {
  clientLabel,
  listCorporateClientSites,
  listCorporateClients,
  siteLabel,
} from "@/api/corporateData";
import { toApiErrorMessage } from "@/api/client";
import type {
  ApplicationSiteDto,
  ApplicationSiteItem,
  CorporateSiteDto,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Props {
  applicationId: number;
}

/**
 * Seção da tela do aplicativo com a lista de sites (CorporateData) vinculados
 * a ele. O botão "Adicionar sites" abre um dialog com dropdown de cliente +
 * multi-select de sites — filtrando os pares (client, site) que já estão
 * vinculados a este aplicativo.
 *
 * Salvar dispara PUT bulk `/api/applications/{appId}/sites` — substitui a lista.
 */
export function AppSitesSection({ applicationId }: Props) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<ApplicationSiteDto | null>(null);

  const linked = useQuery({
    queryKey: ["app-sites", applicationId],
    queryFn: () => listApplicationSites(applicationId),
    enabled: Number.isFinite(applicationId),
  });

  const putAll = useMutation({
    mutationFn: (items: ApplicationSiteItem[]) =>
      setApplicationSites(applicationId, { sites: items }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["app-sites", applicationId], data);
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Falha ao salvar os sites.")),
  });

  const removeOne = async (row: ApplicationSiteDto) => {
    const rest: ApplicationSiteItem[] = (linked.data ?? [])
      .filter((x) => !(x.clientId === row.clientId && x.siteId === row.siteId))
      .map((x) => ({
        clientId: x.clientId,
        siteId: x.siteId,
        clientName: x.clientName,
        siteName: x.siteName,
      }));
    await putAll.mutateAsync(rest);
    toast.success("Site removido.");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Sites vinculados</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Sites (do CorporateData) que este aplicativo enxerga. Só estes ficam
            disponíveis pra atribuir a usuários.
          </p>
        </div>
        <Button variant="brand" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar sites
        </Button>
      </CardHeader>
      <CardContent>
        {linked.isLoading ? (
          <InlineLoader />
        ) : linked.isError ? (
          <ErrorState onRetry={() => linked.refetch()} />
        ) : (linked.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum site vinculado"
            description="Adicione clientes e sites para que este aplicativo possa oferecê-los aos usuários."
            action={
              <Button variant="brand" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Adicionar sites
              </Button>
            }
          />
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(linked.data ?? []).map((row) => (
                  <TableRow key={`${row.clientId}-${row.siteId}`}>
                    <TableCell className="font-medium">
                      {row.clientName || `Cliente ${row.clientId}`}
                    </TableCell>
                    <TableCell>{row.siteName || `Site ${row.siteId}`}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToRemove(row)}
                        title="Remover"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddSitesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        applicationId={applicationId}
        current={linked.data ?? []}
        onSubmit={async (newItems) => {
          const merged: ApplicationSiteItem[] = [
            ...(linked.data ?? []).map((x) => ({
              clientId: x.clientId,
              siteId: x.siteId,
              clientName: x.clientName,
              siteName: x.siteName,
            })),
            ...newItems,
          ];
          await putAll.mutateAsync(merged);
          toast.success(
            `${newItems.length} site${newItems.length === 1 ? "" : "s"} vinculado${newItems.length === 1 ? "" : "s"}.`,
          );
          setAddOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(v) => !v && setToRemove(null)}
        title="Remover site"
        description={`Desvincular "${toRemove?.siteName ?? toRemove?.siteId}" (cliente ${toRemove?.clientName ?? toRemove?.clientId}) desta aplicação?`}
        confirmLabel="Remover"
        onConfirm={async () => {
          if (toRemove) await removeOne(toRemove);
          setToRemove(null);
        }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dialog: adicionar sites
// ---------------------------------------------------------------------------

interface AddDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: number;
  current: ApplicationSiteDto[];
  onSubmit: (items: ApplicationSiteItem[]) => Promise<void>;
}

function AddSitesDialog({ open, onOpenChange, current, onSubmit }: AddDialogProps) {
  const [clientId, setClientId] = useState<string>("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["corporate-clients"],
    queryFn: () => listCorporateClients(),
    enabled: open,
    staleTime: 1000 * 60 * 10,
  });

  const numericClient = clientId ? Number(clientId) : undefined;
  const sitesQuery = useQuery({
    queryKey: ["corporate-sites", numericClient],
    queryFn: () => listCorporateClientSites(numericClient as number),
    enabled: open && Boolean(numericClient),
  });

  // Reset state quando o dialog abre/fecha ou muda de cliente.
  useEffect(() => {
    if (!open) {
      setClientId("");
      setSelectedSiteIds(new Set());
    }
  }, [open]);
  useEffect(() => {
    setSelectedSiteIds(new Set());
  }, [clientId]);

  // Pares (client, site) já vinculados — pra filtrar o multi-select.
  const alreadyLinkedForClient = useMemo(() => {
    if (!numericClient) return new Set<number>();
    return new Set(
      current
        .filter((c) => c.clientId === numericClient)
        .map((c) => c.siteId),
    );
  }, [current, numericClient]);

  // Também: se TODOS os sites de um cliente já estão vinculados, o cliente
  // some do dropdown (o requisito diz pra só mostrar os que ainda não foram).
  // Sem chamar site-a-site pra saber "todos", filtramos por "existe algum
  // vínculo com este cliente que já esgota" seria custoso — na prática o
  // dropdown deixa o cliente aparecer, e o multi-select fica vazio quando
  // não sobra site pra escolher (aviso mostrado). Isso mantém UX rápida.

  const availableSites: CorporateSiteDto[] = useMemo(
    () => (sitesQuery.data ?? []).filter((s) => !alreadyLinkedForClient.has(s.id)),
    [sitesQuery.data, alreadyLinkedForClient],
  );

  const toggleSite = (siteId: number) =>
    setSelectedSiteIds((s) => {
      const next = new Set(s);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });

  const submit = async () => {
    if (!numericClient || selectedSiteIds.size === 0) return;
    const client = (clientsQuery.data ?? []).find((c) => c.id === numericClient);
    const clientLbl = client ? clientLabel(client) : null;
    const items: ApplicationSiteItem[] = availableSites
      .filter((s) => selectedSiteIds.has(s.id))
      .map((s) => ({
        clientId: numericClient,
        siteId: s.id,
        clientName: clientLbl,
        siteName: siteLabel(s),
      }));

    setSaving(true);
    try {
      await onSubmit(items);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar sites</DialogTitle>
          <DialogDescription>
            Escolha um cliente e marque os sites que este aplicativo passará a
            enxergar. Sites já vinculados não aparecem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {clientsQuery.isLoading ? (
            <InlineLoader />
          ) : clientsQuery.isError ? (
            <ErrorState onRetry={() => clientsQuery.refetch()} message="Falha ao carregar clientes." />
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsQuery.data ?? []).length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        Nenhum cliente disponível
                      </SelectItem>
                    ) : (
                      (clientsQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {clientLabel(c)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {numericClient && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Sites{" "}
                    <span className="text-xs text-muted-foreground">
                      ({selectedSiteIds.size} selecionado{selectedSiteIds.size === 1 ? "" : "s"})
                    </span>
                  </label>
                  {sitesQuery.isLoading ? (
                    <InlineLoader />
                  ) : sitesQuery.isError ? (
                    <ErrorState onRetry={() => sitesQuery.refetch()} message="Falha ao carregar sites." />
                  ) : availableSites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todos os sites deste cliente já estão vinculados.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                      {availableSites.map((s) => {
                        const active = selectedSiteIds.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted/40"
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleSite(s.id)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="text-sm">{siteLabel(s)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            onClick={submit}
            disabled={saving || !numericClient || selectedSiteIds.size === 0}
          >
            {saving
              ? "Salvando…"
              : `Vincular${selectedSiteIds.size > 0 ? ` (${selectedSiteIds.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
