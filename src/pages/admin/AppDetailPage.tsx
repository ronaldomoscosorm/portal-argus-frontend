import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getApplication } from "@/api/applications";
import {
  deactivateAccessProfile,
  hardDeleteAccessProfile,
  listAppProfiles,
} from "@/api/accessProfiles";
import type { AccessProfileDto, ApplicationDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ApplicationFormDialog } from "@/components/admin/ApplicationFormDialog";
import { AccessProfileFormDialog } from "@/components/admin/AccessProfileFormDialog";
import { ProfileMenusDialog } from "@/components/admin/ProfileMenusDialog";
import { AppMenusSection } from "@/components/admin/AppMenusSection";
import { AppSitesSection } from "@/components/admin/AppSitesSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, ErrorState, InlineLoader } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function AppHeaderCard({ app, onEdit }: { app: ApplicationDto; onEdit: () => void }) {
  return (
    <Card className="mb-8">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            {app.iconUrl ? (
              <img src={app.iconUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              app.code.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              {app.displayName}
              {app.isActive ? (
                <Badge variant="success">Ativo</Badge>
              ) : (
                <Badge variant="muted">Inativo</Badge>
              )}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{app.code}</code> ·{" "}
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand hover:underline"
              >
                {app.url}
              </a>
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </CardHeader>
      {app.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{app.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const queryClient = useQueryClient();

  const [editAppOpen, setEditAppOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfileDto | null>(null);
  const [toDeactivate, setToDeactivate] = useState<AccessProfileDto | null>(null);
  const [toHardDelete, setToHardDelete] = useState<AccessProfileDto | null>(null);
  const [menusOf, setMenusOf] = useState<AccessProfileDto | null>(null);

  const appQuery = useQuery({
    queryKey: ["application", appId],
    queryFn: () => getApplication(appId),
    enabled: Number.isFinite(appId),
  });

  const profilesQuery = useQuery({
    queryKey: ["app-profiles", appId],
    queryFn: () => listAppProfiles(appId, true),
    enabled: Number.isFinite(appId),
  });

  const deactivate = useMutation({
    mutationFn: (profileId: number) => deactivateAccessProfile(profileId),
    onSuccess: async () => {
      toast.success("Perfil desativado.");
      await queryClient.invalidateQueries({ queryKey: ["app-profiles", appId] });
    },
    onError: (err) => toast.error(toApiErrorMessage(err, "Não foi possível desativar.")),
  });

  const hardDelete = useMutation({
    mutationFn: (profileId: number) => hardDeleteAccessProfile(profileId),
    onSuccess: async () => {
      toast.success("Perfil excluído permanentemente.");
      await queryClient.invalidateQueries({ queryKey: ["app-profiles", appId] });
    },
    onError: (err) => {
      // 409: o backend devolve { message, blockers: [{ userId, userName, ... }] }
      // Mostramos até 3 usuários bloqueadores para o admin desvincular antes.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const body = err.response.data as
          | { message?: string; blockers?: Array<{ userName?: string | null }> }
          | undefined;
        const names = (body?.blockers ?? [])
          .map((b) => b.userName)
          .filter((n): n is string => Boolean(n));
        const preview = names.slice(0, 3).join(", ");
        const more = names.length > 3 ? ` e mais ${names.length - 3}` : "";
        toast.error(
          names.length > 0
            ? `Existem vínculos ativos: ${preview}${more}. Remova-os antes de excluir.`
            : body?.message ?? "Existem vínculos ativos que impedem a exclusão.",
        );
        return;
      }
      toast.error(toApiErrorMessage(err, "Não foi possível excluir permanentemente."));
    },
  });

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileFormOpen(true);
  };
  const openEditProfile = (p: AccessProfileDto) => {
    setEditingProfile(p);
    setProfileFormOpen(true);
  };

  return (
    <AdminLayout
      title="Detalhe do aplicativo"
      actions={
        <Button variant="ghost" asChild>
          <Link to="/admin/apps">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      {appQuery.isLoading ? (
        <InlineLoader />
      ) : appQuery.isError || !appQuery.data ? (
        <ErrorState onRetry={() => appQuery.refetch()} />
      ) : (
        <>
          <AppHeaderCard app={appQuery.data} onEdit={() => setEditAppOpen(true)} />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Perfis de acesso</h2>
              <p className="text-sm text-muted-foreground">
                Papel que um usuário pode ter <strong>dentro deste aplicativo</strong>{" "}
                (ex.: recepcionista, portaria, supervisor). Cada perfil define quais
                menus e ações CRUD ficam disponíveis — configure pelo ícone de árvore
                de cada linha.
              </p>
            </div>
            <Button variant="brand" onClick={openCreateProfile}>
              <Plus className="h-4 w-4" /> Novo perfil
            </Button>
          </div>

          {profilesQuery.isLoading ? (
            <InlineLoader />
          ) : profilesQuery.isError ? (
            <ErrorState onRetry={() => profilesQuery.refetch()} />
          ) : !profilesQuery.data || profilesQuery.data.length === 0 ? (
            <EmptyState
              title="Nenhum perfil cadastrado"
              description="Crie perfis para poder vinculá-los aos usuários deste app."
              action={
                <Button variant="brand" onClick={openCreateProfile}>
                  <Plus className="h-4 w-4" /> Novo perfil
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesQuery.data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {p.isActive ? (
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
                            onClick={() => openEditProfile(p)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMenusOf(p)}
                            title="Menus do perfil"
                          >
                            <ListTree className="h-4 w-4" />
                          </Button>
                          {p.isActive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDeactivate(p)}
                              title="Desativar"
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToHardDelete(p)}
                              title="Excluir permanentemente"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sites do CorporateData vinculados a esta aplicação. */}
          <div className="mt-8">
            <AppSitesSection applicationId={appId} />
          </div>

          {/* Catálogo de menus do aplicativo — fonte da UI de atribuição por perfil. */}
          <div className="mt-8">
            <AppMenusSection applicationId={appId} />
          </div>

          <ApplicationFormDialog
            open={editAppOpen}
            onOpenChange={setEditAppOpen}
            app={appQuery.data}
          />
          <AccessProfileFormDialog
            open={profileFormOpen}
            onOpenChange={setProfileFormOpen}
            applicationId={appId}
            profile={editingProfile}
          />
          <ConfirmDialog
            open={Boolean(toDeactivate)}
            onOpenChange={(v) => !v && setToDeactivate(null)}
            title="Desativar perfil"
            description={`Desativar o perfil "${toDeactivate?.name}"? Ele deixará de ser oferecido em novos vínculos.`}
            confirmLabel="Desativar"
            onConfirm={async () => {
              if (toDeactivate) await deactivate.mutateAsync(toDeactivate.id);
              setToDeactivate(null);
            }}
          />
          {menusOf && (
            <ProfileMenusDialog
              open={Boolean(menusOf)}
              onOpenChange={(v) => !v && setMenusOf(null)}
              applicationId={appId}
              profileId={menusOf.id}
              profileName={menusOf.name}
            />
          )}
          <ConfirmDialog
            open={Boolean(toHardDelete)}
            onOpenChange={(v) => !v && setToHardDelete(null)}
            title="Excluir permanentemente"
            description={`Excluir "${toHardDelete?.name}" para sempre? A operação é irreversível e só será concluída se nenhum usuário estiver vinculado a esse perfil.`}
            confirmLabel="Excluir permanentemente"
            onConfirm={async () => {
              if (toHardDelete) await hardDelete.mutateAsync(toHardDelete.id);
              setToHardDelete(null);
            }}
          />
        </>
      )}
    </AdminLayout>
  );
}
