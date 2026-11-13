import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { listUserSites, setUserSites } from "@/api/userSites";
import { listApplicationSites } from "@/api/applicationSites";
import { listApplications } from "@/api/applications";
import { toApiErrorMessage } from "@/api/client";
import type {
  ApplicationSiteDto,
  UserSiteItem,
} from "@/api/types";
import { Button } from "@/components/ui/button";
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

interface Props {
  userId: number;
}

/**
 * Sites (do CorporateData) atribuídos a um usuário. A oferta é limitada aos
 * pares (cliente, site) que estão vinculados a algum aplicativo do Portal
 * Argus (via ApplicationSites) — ou seja, o admin não escolhe direto do
 * CorporateData, escolhe entre os sites já "declarados" pelos apps.
 *
 * O vínculo usuário↔site vira a claim `argus_sites` no JWT
 * (formato `clientCode:siteCode` — hoje guardando o número dos ids).
 */
export function UserSitesSection({ userId }: Props) {
  const queryClient = useQueryClient();

  const assigned = useQuery({
    queryKey: ["user-sites", userId],
    queryFn: () => listUserSites(userId),
    enabled: Number.isFinite(userId),
  });

  // Catálogo: união dos sites vinculados a cada app cadastrado.
  const apps = useQuery({
    queryKey: ["applications", { includeInactive: false }],
    queryFn: () => listApplications(false),
    staleTime: 1000 * 60 * 10,
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog-app-sites"],
    enabled: Boolean(apps.data && apps.data.length > 0),
    queryFn: async () => {
      const arrays = await Promise.all(
        (apps.data ?? []).map((a) => listApplicationSites(a.id).catch(() => [] as ApplicationSiteDto[])),
      );
      // Dedupe por (clientId, siteId) — mesmo site pode estar em vários apps.
      const seen = new Map<string, ApplicationSiteDto>();
      for (const arr of arrays) {
        for (const s of arr) {
          const k = `${s.clientId}::${s.siteId}`;
          if (!seen.has(k)) seen.set(k, s);
        }
      }
      return Array.from(seen.values());
    },
    staleTime: 1000 * 60 * 5,
  });

  const [pending, setPending] = useState<UserSiteItem[] | null>(null);
  const rows: UserSiteItem[] =
    pending ??
    (assigned.data ?? []).map((s) => ({
      clientCode: s.clientCode,
      siteCode: s.siteCode,
    }));

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const catalogByKey = useMemo(() => {
    const map = new Map<string, ApplicationSiteDto>();
    for (const s of catalogQuery.data ?? []) map.set(`${s.clientId}::${s.siteId}`, s);
    return map;
  }, [catalogQuery.data]);

  const toggleKey = (key: string) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addSelected = () => {
    const existing = new Set(rows.map((r) => `${r.clientCode}::${r.siteCode}`));
    const added: UserSiteItem[] = [];
    for (const key of selectedKeys) {
      const item = catalogByKey.get(key);
      if (!item || existing.has(key)) continue;
      added.push({ clientCode: String(item.clientId), siteCode: String(item.siteId) });
    }
    if (added.length > 0) setPending([...rows, ...added]);
    setSelectedKeys(new Set());
  };

  const removeAt = (idx: number) =>
    setPending(rows.filter((_, i) => i !== idx));

  const dirty = pending !== null;

  const save = useMutation({
    mutationFn: () => setUserSites(userId, { sites: rows }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["user-sites", userId], data);
      setPending(null);
      toast.success("Sites atualizados.");
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Falha ao salvar os sites.")),
  });

  const siteText = (s: ApplicationSiteDto) =>
    `${s.clientName || `Cliente ${s.clientId}`} — ${s.siteName || `Site ${s.siteId}`}`;

  const availableSites = useMemo(
    () =>
      (catalogQuery.data ?? [])
        .filter(
          (s) => !rows.some((r) => r.clientCode === String(s.clientId) && r.siteCode === String(s.siteId)),
        )
        .sort((a, b) => siteText(a).localeCompare(siteText(b), "pt-BR", { sensitivity: "base" })),
    [catalogQuery.data, rows],
  );
  const selectedCount = availableSites.filter((s) =>
    selectedKeys.has(`${s.clientId}::${s.siteId}`),
  ).length;

  const labelFor = (r: UserSiteItem) => {
    const item = catalogByKey.get(`${r.clientCode}::${r.siteCode}`);
    if (!item) return { client: r.clientCode || "—", site: r.siteCode };
    return {
      client: item.clientName ?? r.clientCode,
      site: item.siteName ?? r.siteCode,
    };
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Sites</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Sites que este usuário pode acessar. A oferta é limitada aos sites
            que os aplicativos declararam (aba <em>Aplicativos → Sites vinculados</em>).
          </p>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={save.isPending}>
              Descartar
            </Button>
            <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {assigned.isLoading || apps.isLoading || catalogQuery.isLoading ? (
          <InlineLoader />
        ) : assigned.isError ? (
          <ErrorState onRetry={() => assigned.refetch()} />
        ) : (
          <>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Sites disponíveis{" "}
                  <span className="text-xs text-muted-foreground">
                    ({selectedCount} selecionado{selectedCount === 1 ? "" : "s"})
                  </span>
                </span>
                <Button variant="outline" onClick={addSelected} disabled={selectedCount === 0}>
                  <Plus className="h-4 w-4" /> Adicionar
                  {selectedCount > 0 ? ` (${selectedCount})` : ""}
                </Button>
              </div>
              {availableSites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {catalogQuery.data?.length
                    ? "Todos os sites disponíveis já estão atribuídos."
                    : "Nenhum site vinculado aos aplicativos."}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  {availableSites.map((s) => {
                    const key = `${s.clientId}::${s.siteId}`;
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(key)}
                          onChange={() => toggleKey(key)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm">{siteText(s)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title="Sem sites atribuídos"
                description="Marque um ou mais sites na lista acima e clique em Adicionar."
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
                    {rows.map((r, idx) => {
                      const { client, site } = labelFor(r);
                      return (
                        <TableRow key={`${r.clientCode}:${r.siteCode}`}>
                          <TableCell className="font-medium">{client}</TableCell>
                          <TableCell>{site}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAt(idx)}
                              title="Remover"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
