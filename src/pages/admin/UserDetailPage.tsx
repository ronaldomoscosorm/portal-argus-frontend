import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { assignRole, getUser, sendPasswordResetLink, unassignRole } from "@/api/users";
import { listRoles } from "@/api/roles";
import { listApplications } from "@/api/applications";
import { listAppProfiles } from "@/api/accessProfiles";
import {
  changeProfile,
  grantAccess,
  listByUser,
  revokeAccess,
} from "@/api/userApplications";
import type { ApplicationDto, UserApplicationDto, UserDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { mfaMethodLabel } from "@/lib/labels";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { UserSitesSection } from "@/components/admin/UserSitesSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const NONE = "none";

// ---------------------------------------------------------------------------
// Seção: roles globais
// ---------------------------------------------------------------------------
function RolesSection({ user }: { user: UserDto }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string>("");

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  const available = useMemo(
    () => (rolesQuery.data ?? []).filter((r) => !user.roles.includes(r.name)),
    [rolesQuery.data, user.roles],
  );

  const assign = useMutation({
    mutationFn: (roleName: string) => assignRole(user.id, { roleName }),
    onSuccess: async () => {
      toast.success("Role atribuída.");
      setSelected("");
      await queryClient.invalidateQueries({ queryKey: ["user", user.id] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível atribuir a role.")),
  });

  const unassign = useMutation({
    mutationFn: (roleName: string) => unassignRole(user.id, roleName),
    onSuccess: async () => {
      toast.success("Role removida.");
      await queryClient.invalidateQueries({ queryKey: ["user", user.id] });
    },
    onError: (err) => {
      // 409 do backend quando é o último Administrator.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const body = err.response.data as { message?: string } | undefined;
        toast.error(body?.message ?? "Não é possível remover essa role.");
        return;
      }
      toast.error(toApiErrorMessage(err, "Não foi possível remover a role."));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso ao console admin</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>Administrator</strong> acessa o console de administração do Portal.{" "}
          <strong>User</strong> é usuário comum — só vê as aplicações vinculadas. Para
          definir o papel dentro de cada aplicativo (recepcionista, portaria, etc.),
          use a seção <em>Aplicativos &amp; perfis</em> abaixo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {user.roles.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sem role global.</span>
          ) : (
            user.roles.map((r) => (
              <Badge
                key={r}
                variant={r === "Administrator" ? "brand" : "outline"}
                className="gap-1 pr-1"
              >
                {r}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remover a role "${r}" deste usuário?`)) {
                      unassign.mutate(r);
                    }
                  }}
                  disabled={unassign.isPending}
                  className="ml-0.5 rounded p-0.5 hover:bg-black/10 disabled:opacity-50"
                  title="Remover role"
                  aria-label={`Remover role ${r}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Adicionar role</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma role" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Nenhuma role disponível
                  </SelectItem>
                ) : (
                  available.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled={!selected || assign.isPending}
            onClick={() => selected && assign.mutate(selected)}
          >
            <Plus className="h-4 w-4" /> Atribuir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Seletor de perfil por linha (troca o perfil do vínculo)
// ---------------------------------------------------------------------------
function ProfileSelect({ link }: { link: UserApplicationDto }) {
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ["app-profiles", link.applicationId, false],
    queryFn: () => listAppProfiles(link.applicationId, false),
  });

  const change = useMutation({
    mutationFn: (value: string) =>
      changeProfile(link.userId, link.applicationId, {
        accessProfileId: value === NONE ? null : Number(value),
      }),
    onSuccess: async () => {
      toast.success("Perfil atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["user-apps", link.userId] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível trocar o perfil.")),
  });

  const value = link.profile ? String(link.profile.id) : NONE;

  return (
    <Select
      value={value}
      onValueChange={(v) => change.mutate(v)}
      disabled={change.isPending || profilesQuery.isLoading}
    >
      <SelectTrigger className="h-9 w-52">
        <SelectValue placeholder="Sem perfil" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sem perfil</SelectItem>
        {(profilesQuery.data ?? []).map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Diálogo: conceder acesso a um app
// ---------------------------------------------------------------------------
function GrantAccessDialog({
  open,
  onOpenChange,
  userId,
  grantedAppIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  grantedAppIds: number[];
}) {
  const queryClient = useQueryClient();
  const [appId, setAppId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>(NONE);

  const appsQuery = useQuery({
    queryKey: ["applications", { includeInactive: false }],
    queryFn: () => listApplications(false),
    enabled: open,
  });

  const numericAppId = appId ? Number(appId) : undefined;
  const profilesQuery = useQuery({
    queryKey: ["app-profiles", numericAppId, false],
    queryFn: () => listAppProfiles(numericAppId as number, false),
    enabled: open && Boolean(numericAppId),
  });

  const available = useMemo(
    () => (appsQuery.data ?? []).filter((a: ApplicationDto) => !grantedAppIds.includes(a.id)),
    [appsQuery.data, grantedAppIds],
  );

  const grant = useMutation({
    mutationFn: () =>
      grantAccess({
        userId,
        applicationId: Number(appId),
        accessProfileId: profileId === NONE ? null : Number(profileId),
      }),
    onSuccess: async () => {
      toast.success("Acesso concedido.");
      await queryClient.invalidateQueries({ queryKey: ["user-apps", userId] });
      onOpenChange(false);
      setAppId("");
      setProfileId(NONE);
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível conceder o acesso.")),
  });

  const noProfiles = Boolean(numericAppId) && !profilesQuery.isLoading &&
    (profilesQuery.data?.length ?? 0) === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (grant.isPending) return;
        onOpenChange(v);
        if (!v) {
          setAppId("");
          setProfileId(NONE);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder acesso</DialogTitle>
          <DialogDescription>
            Escolha um aplicativo e (opcionalmente) um perfil de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Aplicativo</Label>
            <Select
              value={appId}
              onValueChange={(v) => {
                setAppId(v);
                setProfileId(NONE);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um aplicativo" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    Nenhum app disponível
                  </SelectItem>
                ) : (
                  available.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.displayName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select
              value={profileId}
              onValueChange={setProfileId}
              disabled={!numericAppId || profilesQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem perfil</SelectItem>
                {(profilesQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noProfiles && (
              <p className="text-xs text-muted-foreground">
                Este app não tem perfis cadastrados. Você pode conceder sem perfil e cadastrar
                perfis depois no detalhe do app.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={grant.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="brand"
            onClick={() => grant.mutate()}
            disabled={!appId || grant.isPending}
          >
            {grant.isPending ? "Concedendo…" : "Conceder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Botão: envia link de redefinição por e-mail
// ---------------------------------------------------------------------------
function SendResetLinkButton({ userId }: { userId: number }) {
  const mutation = useMutation({
    mutationFn: () => sendPasswordResetLink(userId),
    onSuccess: () => toast.success("Link de redefinição enviado."),
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 502) {
        toast.error("Falha ao enviar o e-mail. Verifique a configuração SMTP no servidor.");
        return;
      }
      toast.error(toApiErrorMessage(err, "Não foi possível enviar o link."));
    },
  });
  return (
    <Button
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <KeyRound className="h-4 w-4" />
      {mutation.isPending ? "Enviando…" : "Enviar link p/ redefinir senha"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [toRevoke, setToRevoke] = useState<UserApplicationDto | null>(null);

  const userQuery = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    enabled: Number.isFinite(userId),
  });

  const appsQuery = useQuery({
    queryKey: ["user-apps", userId],
    queryFn: () => listByUser(userId),
    enabled: Number.isFinite(userId),
  });

  const revoke = useMutation({
    mutationFn: (link: UserApplicationDto) => revokeAccess(link.userId, link.applicationId),
    onSuccess: async () => {
      toast.success("Acesso revogado.");
      await queryClient.invalidateQueries({ queryKey: ["user-apps", userId] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível revogar.")),
  });

  const grantedAppIds = (appsQuery.data ?? []).map((l) => l.applicationId);

  return (
    <AdminLayout
      title="Detalhe do usuário"
      actions={
        <Button variant="ghost" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      {userQuery.isLoading ? (
        <InlineLoader />
      ) : userQuery.isError || !userQuery.data ? (
        <ErrorState onRetry={() => userQuery.refetch()} />
      ) : (
        <div className="space-y-8">
          {/* Dados do usuário */}
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{userQuery.data.name ?? userQuery.data.userName}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{userQuery.data.userName}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={userQuery.data.mfaMethod === "None" ? "muted" : "secondary"}>
                    2FA: {mfaMethodLabel(userQuery.data.mfaMethod)}
                  </Badge>
                  {userQuery.data.phoneNumber && (
                    <span className="text-muted-foreground">{userQuery.data.phoneNumber}</span>
                  )}
                  {userQuery.data.isAdSynced && <Badge variant="outline">AD</Badge>}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <SendResetLinkButton userId={userQuery.data.id} />
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              </div>
            </CardHeader>
          </Card>

          <RolesSection user={userQuery.data} />

          <UserSitesSection userId={userQuery.data.id} />

          {/* Aplicativos & perfis */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Aplicativos & perfis</h2>
                <p className="text-sm text-muted-foreground">
                  Apps concedidos a este usuário e o perfil vigente em cada um.
                </p>
              </div>
              <Button variant="brand" onClick={() => setGrantOpen(true)}>
                <Plus className="h-4 w-4" /> Conceder acesso
              </Button>
            </div>

            {appsQuery.isLoading ? (
              <InlineLoader />
            ) : appsQuery.isError ? (
              <ErrorState onRetry={() => appsQuery.refetch()} />
            ) : !appsQuery.data || appsQuery.data.length === 0 ? (
              <EmptyState
                title="Nenhum acesso concedido"
                description="Conceda acesso a um aplicativo para este usuário."
                action={
                  <Button variant="brand" onClick={() => setGrantOpen(true)}>
                    <Plus className="h-4 w-4" /> Conceder acesso
                  </Button>
                }
              />
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aplicativo</TableHead>
                      <TableHead className="w-56">Perfil</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appsQuery.data.map((link) => (
                      <TableRow key={link.applicationId}>
                        <TableCell>
                          <div className="font-medium">{link.displayName}</div>
                          <code className="text-xs text-muted-foreground">{link.code}</code>
                        </TableCell>
                        <TableCell>
                          <ProfileSelect link={link} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              title="Revogar acesso"
                              onClick={() => setToRevoke(link)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <UserFormDialog open={editOpen} onOpenChange={setEditOpen} user={userQuery.data} />
          <GrantAccessDialog
            open={grantOpen}
            onOpenChange={setGrantOpen}
            userId={userId}
            grantedAppIds={grantedAppIds}
          />
          <ConfirmDialog
            open={Boolean(toRevoke)}
            onOpenChange={(v) => !v && setToRevoke(null)}
            title="Revogar acesso"
            description={`Revogar o acesso de "${userQuery.data.name ?? userQuery.data.userName}" ao app "${toRevoke?.displayName}"?`}
            confirmLabel="Revogar"
            onConfirm={async () => {
              if (toRevoke) await revoke.mutateAsync(toRevoke);
              setToRevoke(null);
            }}
          />
        </div>
      )}
    </AdminLayout>
  );
}
