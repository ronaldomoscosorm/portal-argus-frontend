import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { listApplications } from "@/api/applications";
import { listAppProfiles } from "@/api/accessProfiles";
import { listApplicationSites } from "@/api/applicationSites";
import { listRoles } from "@/api/roles";
import { bulkCreateUsers } from "@/api/users";
import { toApiErrorMessage } from "@/api/client";
import type {
  AccessProfileDto,
  ApplicationSiteDto,
  BulkCreateUsersResult,
  MfaMethod,
} from "@/api/types";
import { MFA_METHOD_OPTIONS, mfaMethodLabel } from "@/lib/labels";
import {
  BULK_CSV_HEADER,
  BULK_CSV_TEMPLATE,
  BULK_MAX_ROWS,
  parseBulkUsersCsv,
} from "@/lib/bulkUsersCsv";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState, InlineLoader } from "@/components/PageState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Cadastro em lote de usuários: CSV colado ou enviado, validado contra o catálogo
 * (aplicativos, perfis, roles e sites) antes do envio ao endpoint POST /api/users/bulk.
 */
export function UsersBulkPage() {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [sendResetLink, setSendResetLink] = useState(true);
  const [defaultMfaMethod, setDefaultMfaMethod] = useState<MfaMethod>("None");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BulkCreateUsersResult | null>(null);

  const appsQuery = useQuery({
    queryKey: ["applications", { includeInactive: false }],
    queryFn: () => listApplications(false),
  });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  const apps = useMemo(() => (appsQuery.data ?? []).filter((a) => a.isActive), [appsQuery.data]);

  const profileQueries = useQueries({
    queries: apps.map((app) => ({
      queryKey: ["app-profiles", app.id, { includeInactive: false }],
      queryFn: () => listAppProfiles(app.id, false),
    })),
  });

  const profilesByApp = useMemo(() => {
    const map: Record<number, AccessProfileDto[]> = {};
    apps.forEach((app, i) => {
      map[app.id] = profileQueries[i]?.data ?? [];
    });
    return map;
  }, [apps, profileQueries]);

  const siteQueries = useQueries({
    queries: apps.map((app) => ({
      queryKey: ["app-sites", app.id],
      queryFn: () => listApplicationSites(app.id),
    })),
  });
  const sitesByApp = useMemo(() => {
    const map: Record<number, ApplicationSiteDto[]> = {};
    apps.forEach((app, i) => {
      map[app.id] = siteQueries[i]?.data ?? [];
    });
    return map;
  }, [apps, siteQueries]);
  // Catálogo de sites exibido na dica: união dos sites de todos os aplicativos.
  const allSites = useMemo(() => {
    const seen = new Map<string, ApplicationSiteDto>();
    for (const list of Object.values(sitesByApp)) {
      for (const s of list) seen.set(`${s.clientId}:${s.siteId}`, s);
    }
    return Array.from(seen.values()).sort((a, b) =>
      `${a.clientName}:${a.siteName}`.localeCompare(`${b.clientName}:${b.siteName}`),
    );
  }, [sitesByApp]);

  const catalogLoading =
    appsQuery.isLoading ||
    rolesQuery.isLoading ||
    profileQueries.some((q) => q.isLoading) ||
    siteQueries.some((q) => q.isLoading);
  const catalogError =
    appsQuery.isError ||
    rolesQuery.isError ||
    profileQueries.some((q) => q.isError) ||
    siteQueries.some((q) => q.isError);

  const rows = useMemo(
    () =>
      parseBulkUsersCsv(
        rawText,
        { apps, roles: rolesQuery.data ?? [], profilesByApp, sitesByApp },
        { sendResetLink, defaultMfaMethod },
      ),
    [rawText, apps, rolesQuery.data, profilesByApp, sitesByApp, sendResetLink, defaultMfaMethod],
  );
  const siteLabel = (key: string) => {
    const [c, s] = key.split(":");
    const found = allSites.find((x) => String(x.clientId) === c && String(x.siteId) === s);
    return found ? `${found.clientName ?? c} · ${found.siteName ?? s}` : key;
  };
  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const invalidCount = rows.length - validRows.length;
  const tooMany = rows.length > BULK_MAX_ROWS;

  const mutation = useMutation({
    mutationFn: () =>
      bulkCreateUsers({
        users: validRows.map((r) => r.item),
        sendResetLink,
        defaultMfaMethod,
      }),
    onSuccess: async (res) => {
      setResult(res);
      if (res.failed === 0) {
        setRawText("");
        toast.success(`${res.created} usuário(s) cadastrado(s).`);
      } else {
        toast.warning(`${res.created} cadastrado(s), ${res.failed} rejeitado(s). Veja o resultado.`);
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível cadastrar os usuários.")),
  });

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setRawText(await file.text());
    event.target.value = "";
  };

  const onDownloadTemplate = () => {
    const blob = new Blob(["﻿" + BULK_CSV_TEMPLATE + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-cadastro-usuarios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Cadastro em lote"
      description="Crie vários usuários de uma vez, com as roles globais e os aplicativos (perfil) de cada um."
      actions={
        <Button variant="outline" onClick={onDownloadTemplate}>
          <Download className="h-4 w-4" /> Baixar modelo CSV
        </Button>
      }
    >
      {catalogLoading ? (
        <InlineLoader label="Carregando catálogo…" />
      ) : catalogError ? (
        <ErrorState
          message="Não foi possível carregar aplicativos, perfis e roles."
          onRetry={() => {
            void appsQuery.refetch();
            void rolesQuery.refetch();
            profileQueries.forEach((q) => void q.refetch());
            siteQueries.forEach((q) => void q.refetch());
          }}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Dados dos usuários</CardTitle>
              <CardDescription>
                Uma linha por usuário, colunas separadas por <code>;</code> (ou tabulação/vírgula):{" "}
                <code>{BULK_CSV_HEADER}</code>. Em <em>aplicativos</em>, use <code>codigo:Perfil</code>{" "}
                separados por <code>|</code> (ex.: <code>clearid:Administrator|argus:Operator</code>). Em{" "}
                <em>roles</em>, os nomes separados por <code>|</code>. Em <em>sites</em>, os nomes dos sites
                separados por <code>;</code> na mesma coluna, entre aspas (ex.:{" "}
                <code>&quot;LA-BR-Alphaville;LA-BR-Itumbiara&quot;</code>); use <code>Cliente:Site</code>{" "}
                quando o nome existir em mais de um cliente. Telefone, MFA, senha, roles e sites são
                opcionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4" /> Enviar arquivo CSV
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      className="sr-only"
                      onChange={onFileChange}
                      disabled={mutation.isPending}
                    />
                  </label>
                </Button>
                <span className="text-xs text-muted-foreground">ou cole o conteúdo abaixo</span>
              </div>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder={BULK_CSV_TEMPLATE}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setResult(null);
                }}
                disabled={mutation.isPending}
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1">
                  <span>Aplicativos:</span>
                  {apps.length === 0
                    ? "—"
                    : apps.map((a) => (
                        <Badge
                          key={a.id}
                          variant="outline"
                          title={
                            (profilesByApp[a.id] ?? []).map((p) => p.name).join(", ") || "sem perfis"
                          }
                        >
                          {a.code}
                        </Badge>
                      ))}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span>Roles:</span>
                  {(rolesQuery.data ?? []).length === 0
                    ? "—"
                    : rolesQuery.data!.map((r) => (
                        <Badge key={r.id} variant="outline">
                          {r.name}
                        </Badge>
                      ))}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span>Sites:</span>
                  {allSites.length === 0
                    ? "—"
                    : allSites.map((s) => (
                        <Badge key={`${s.clientId}:${s.siteId}`} variant="outline" title={s.clientName ?? ""}>
                          {s.siteName ?? s.siteId}
                        </Badge>
                      ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Opções</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
                <Switch
                  id="sendResetLink"
                  checked={sendResetLink}
                  onCheckedChange={setSendResetLink}
                  disabled={mutation.isPending}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="sendResetLink" className="cursor-pointer">
                    Enviar link para cada usuário definir a senha
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Recomendado. Desmarque para usar a coluna <code>senha</code> do arquivo (obrigatória,
                    mínimo 8 caracteres).
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Método de 2FA padrão</Label>
                <Select
                  value={defaultMfaMethod}
                  onValueChange={(v) => setDefaultMfaMethod(v as MfaMethod)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MFA_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Aplicado às linhas com a coluna <code>mfa</code> vazia.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Pré-visualização</CardTitle>
              <CardDescription>
                {rows.length === 0
                  ? "Cole ou envie os dados para visualizar as linhas."
                  : `${validRows.length} linha(s) válida(s)` +
                    (invalidCount > 0 ? `, ${invalidCount} com erro (serão ignoradas)` : "") +
                    (tooMany ? ` — máximo de ${BULK_MAX_ROWS} por envio` : "")}
              </CardDescription>
            </CardHeader>
            {rows.length > 0 && (
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>2FA</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Aplicativos</TableHead>
                        <TableHead>Sites</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.line} className={r.errors.length ? "bg-destructive/5" : undefined}>
                          <TableCell className="text-muted-foreground">{r.line}</TableCell>
                          <TableCell className="font-medium">{r.item.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.item.userName || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.item.phoneNumber ?? "—"}</TableCell>
                          <TableCell>{mfaMethodLabel(r.item.mfaMethod ?? defaultMfaMethod)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.item.roles.length === 0
                                ? "—"
                                : r.item.roles.map((n) => (
                                    <Badge key={n} variant={n === "Administrator" ? "brand" : "outline"}>
                                      {n}
                                    </Badge>
                                  ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.item.applications.length === 0
                                ? "—"
                                : r.item.applications.map((a) => (
                                    <Badge key={a.applicationCode} variant="secondary">
                                      {a.applicationCode}
                                      {a.profile ? ` · ${a.profile}` : ""}
                                    </Badge>
                                  ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.item.sites.length === 0
                                ? "—"
                                : r.item.sites.map((k) => (
                                    <Badge key={k} variant="outline">
                                      {siteLabel(k)}
                                    </Badge>
                                  ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.errors.length === 0 ? (
                              <Badge variant="success">OK</Badge>
                            ) : (
                              <ul className="list-disc space-y-0.5 pl-4 text-xs text-destructive">
                                {r.errors.map((e) => (
                                  <li key={e}>{e}</li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="brand"
                    onClick={() => setConfirmOpen(true)}
                    disabled={mutation.isPending || validRows.length === 0 || tooMany}
                  >
                    <UserPlus className="h-4 w-4" />
                    {mutation.isPending ? "Cadastrando…" : `Cadastrar ${validRows.length} usuário(s)`}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
                <CardDescription>
                  {result.created} criado(s), {result.failed} rejeitado(s) de {result.total}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Aplicativos</TableHead>
                        <TableHead>Sites</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.items.map((it) => (
                        <TableRow key={it.index} className={it.success ? undefined : "bg-destructive/5"}>
                          <TableCell className="text-muted-foreground">{it.index}</TableCell>
                          <TableCell className="text-muted-foreground">{it.userName ?? "—"}</TableCell>
                          <TableCell>
                            {it.success ? (
                              <Badge variant="success">Criado · id {it.userId}</Badge>
                            ) : (
                              <Badge variant="destructive">Rejeitado</Badge>
                            )}
                          </TableCell>
                          <TableCell>{it.roles.length ? it.roles.join(", ") : "—"}</TableCell>
                          <TableCell>{it.applications.length ? it.applications.join(", ") : "—"}</TableCell>
                          <TableCell>{it.sites?.length ? it.sites.join(", ") : "—"}</TableCell>
                          <TableCell className="text-xs">
                            {it.error && <div className="text-destructive">{it.error}</div>}
                            {it.warnings.map((w) => (
                              <div key={w} className="text-amber-700">
                                {w}
                              </div>
                            ))}
                            {it.resetLinkQueued && (
                              <div className="text-muted-foreground">E-mail do link de senha na fila de envio.</div>
                            )}
                            {!it.error && it.warnings.length === 0 && !it.resetLinkQueued && "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cadastrar usuários em lote"
        description={
          `Serão criados ${validRows.length} usuário(s)` +
          (invalidCount > 0 ? `; ${invalidCount} linha(s) com erro serão ignoradas` : "") +
          (sendResetLink ? ". Cada um receberá, em segundo plano, um e-mail para definir a senha." : ".")
        }
        confirmLabel="Cadastrar"
        destructive={false}
        onConfirm={() => mutation.mutateAsync().then(() => undefined, () => undefined)}
      />
    </AdminLayout>
  );
}
