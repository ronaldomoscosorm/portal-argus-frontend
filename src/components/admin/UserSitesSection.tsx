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

  const [pairKey, setPairKey] = useState<string>("");
  const catalogByKey = useMemo(() => {
    const map = new Map<string, ApplicationSiteDto>();
    for (const s of catalogQuery.data ?? []) map.set(`${s.clientId}::${s.siteId}`, s);
    return map;
  }, [catalogQuery.data]);

  const addSite = () => {
    if (!pairKey) return;
    if (rows.some((r) => `${r.clientCode}::${r.siteCode}` === pairKey)) {
      toast.error("Esse site já está na lista.");
      return;
    }
    const item = catalogByKey.get(pairKey);
    if (!item) return;
    setPending([
      ...rows,
      { clientCode: String(item.clientId), siteCode: String(item.siteId) },
    ]);
    setPairKey("");
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

  const availableInDropdown = useMemo(
    () =>
      (catalogQuery.data ?? []).filter(
        (s) => !rows.some((r) => r.clientCode === String(s.clientId) && r.siteCode === String(s.siteId)),
      ),
    [catalogQuery.data, rows],
  );

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
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <Select value={pairKey} onValueChange={setPairKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um site (cliente + site)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInDropdown.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        {catalogQuery.data?.length
                          ? "Todos os sites disponíveis já estão atribuídos"
                          : "Nenhum site vinculado aos aplicativos"}
                      </SelectItem>
                    ) : (
                      availableInDropdown.map((s) => (
                        <SelectItem key={`${s.clientId}-${s.siteId}`} value={`${s.clientId}::${s.siteId}`}>
                          {s.clientName || `Cliente ${s.clientId}`} — {s.siteName || `Site ${s.siteId}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={addSite} disabled={!pairKey}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title="Sem sites atribuídos"
                description="Escolha um par (cliente + site) do dropdown acima e clique em Adicionar."
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
