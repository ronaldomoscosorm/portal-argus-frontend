import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SITE_SCOPE_LABELS,
  createCorporateSite,
  isClearIdSite,
  updateCorporateSite,
} from "@/api/corporateData";
import type { CorporateSiteDto, CorporateSiteScope } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: number;
  /** Presente = edição; ausente = criação. */
  site?: CorporateSiteDto | null;
}

type FormState = {
  externalId: string;
  name: string;
  sigla: string;
  apelido: string;
  description: string;
  timeZoneId: string;
  regionId: string;
  scope: CorporateSiteScope;
  isActive: boolean;
};

const emptyForm: FormState = {
  externalId: "",
  name: "",
  sigla: "",
  apelido: "",
  description: "",
  timeZoneId: "",
  regionId: "",
  scope: "All",
  isActive: true,
};

const SCOPES = Object.keys(SITE_SCOPE_LABELS) as CorporateSiteScope[];

export function SiteFormDialog({ open, onOpenChange, clienteId, site }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(site);
  const fromClearId = Boolean(site && isClearIdSite(site));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        site
          ? {
              externalId: site.externalId ?? "",
              name: site.name ?? "",
              sigla: site.sigla ?? "",
              apelido: site.apelido ?? "",
              description: site.description ?? "",
              timeZoneId: site.timeZoneId ?? "",
              regionId: site.regionId ?? "",
              scope: site.scope ?? "All",
              isActive: site.isActive ?? true,
            }
          : emptyForm,
      );
    }
  }, [open, site]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        sigla: form.sigla.trim() || null,
        apelido: form.apelido.trim() || null,
        description: form.description.trim() || null,
        timeZoneId: form.timeZoneId.trim() || null,
        regionId: form.regionId.trim() || null,
        scope: form.scope,
        isActive: form.isActive,
      };
      return isEdit && site
        ? updateCorporateSite(site.id, base)
        : createCorporateSite({ ...base, clienteId, externalId: form.externalId.trim() || null });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Site atualizado." : "Site criado.");
      await queryClient.invalidateQueries({ queryKey: ["corporate-sites"] });
      await queryClient.invalidateQueries({ queryKey: ["corporate-clients"] });
      await queryClient.invalidateQueries({ queryKey: ["corporate-client", clienteId] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Não foi possível salvar o site.")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar site" : "Novo site"}</DialogTitle>
          <DialogDescription>
            {fromClearId
              ? "Site espelhado do ClearID: nome, descrição, fuso, região e status são sobrescritos a cada sincronização. A sigla, o apelido e o escopo são preservados."
              : isEdit
                ? "O identificador externo é imutável. Ajuste os demais dados do site."
                : "Cadastre um site para este cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="site-external">
              Identificador externo {isEdit ? "(imutável)" : "(opcional)"}
            </Label>
            <Input
              id="site-external"
              value={form.externalId}
              onChange={(e) => set("externalId", e.target.value)}
              placeholder="siteId do ClearID (GUID)"
              maxLength={100}
              disabled={isEdit || mutation.isPending}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Em branco, o site é tratado como externo ao ClearID e recebe um identificador
                gerado.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Nome</Label>
              <Input
                id="site-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={300}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-sigla">Sigla</Label>
              <Input
                id="site-sigla"
                value={form.sigla}
                onChange={(e) => set("sigla", e.target.value)}
                placeholder="SP01"
                maxLength={20}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-apelido">Apelido</Label>
            <Input
              id="site-apelido"
              value={form.apelido}
              onChange={(e) => set("apelido", e.target.value)}
              placeholder="Alphaville"
              maxLength={100}
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-description">Descrição</Label>
            <Textarea
              id="site-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="site-tz">Fuso horário</Label>
              <Input
                id="site-tz"
                value={form.timeZoneId}
                onChange={(e) => set("timeZoneId", e.target.value)}
                placeholder="America/Sao_Paulo"
                maxLength={100}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-region">Região</Label>
              <Input
                id="site-region"
                value={form.regionId}
                onChange={(e) => set("regionId", e.target.value)}
                placeholder="US"
                maxLength={50}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-scope">Escopo</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => set("scope", v as CorporateSiteScope)}
                disabled={mutation.isPending}
              >
                <SelectTrigger id="site-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SITE_SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => set("isActive", v)}
                disabled={mutation.isPending}
                id="site-active"
              />
              <Label htmlFor="site-active">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
