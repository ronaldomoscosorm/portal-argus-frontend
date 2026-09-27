import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createApplication, updateApplication } from "@/api/applications";
import type { ApplicationDto } from "@/api/types";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = edição; ausente = criação. */
  app?: ApplicationDto | null;
}

type FormState = {
  code: string;
  displayName: string;
  description: string;
  url: string;
  iconUrl: string;
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  displayName: "",
  description: "",
  url: "",
  iconUrl: "",
  displayOrder: "0",
  isActive: true,
};

export function ApplicationFormDialog({ open, onOpenChange, app }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(app);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        app
          ? {
              code: app.code,
              displayName: app.displayName,
              description: app.description ?? "",
              url: app.url,
              iconUrl: app.iconUrl ?? "",
              displayOrder: String(app.displayOrder),
              isActive: app.isActive,
            }
          : emptyForm,
      );
    }
  }, [open, app]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        displayName: form.displayName.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
        iconUrl: form.iconUrl.trim() || null,
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      return isEdit && app
        ? updateApplication(app.id, base)
        : createApplication({ ...base, code: form.code.trim() });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Aplicativo atualizado." : "Aplicativo criado.");
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (app) await queryClient.invalidateQueries({ queryKey: ["application", app.id] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Não foi possível salvar o aplicativo.")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEdit && !form.code.trim()) {
      setError("O código é obrigatório.");
      return;
    }
    if (!form.displayName.trim() || !form.url.trim()) {
      setError("Nome de exibição e URL são obrigatórios.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar aplicativo" : "Novo aplicativo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "O código é imutável. Ajuste os demais dados do aplicativo."
              : "Cadastre um aplicativo no catálogo do Portal Argus."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="code">Código {isEdit && "(imutável)"}</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="argus"
              disabled={isEdit || mutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="Argus — Ordens de Serviço"
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              disabled={mutation.isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://argus.rmtecho.com.br"
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iconUrl">URL do ícone</Label>
              <Input
                id="iconUrl"
                value={form.iconUrl}
                onChange={(e) => set("iconUrl", e.target.value)}
                placeholder="https://…/icon.png"
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayOrder">Ordem</Label>
              <Input
                id="displayOrder"
                type="number"
                value={form.displayOrder}
                onChange={(e) => set("displayOrder", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => set("isActive", v)}
                disabled={mutation.isPending}
                id="isActive"
              />
              <Label htmlFor="isActive">Ativo</Label>
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
