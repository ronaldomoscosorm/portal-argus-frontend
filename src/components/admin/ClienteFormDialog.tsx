import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCorporateClient, updateCorporateClient } from "@/api/corporateData";
import type { CorporateClientDto } from "@/api/types";
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
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = edição; ausente = criação. */
  cliente?: CorporateClientDto | null;
}

type FormState = {
  code: string;
  name: string;
  externalAccountId: string;
  isActive: boolean;
};

const emptyForm: FormState = { code: "", name: "", externalAccountId: "", isActive: true };

export function ClienteFormDialog({ open, onOpenChange, cliente }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(cliente);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        cliente
          ? {
              code: cliente.code ?? "",
              name: cliente.name ?? "",
              externalAccountId: cliente.externalAccountId ?? "",
              isActive: cliente.isActive ?? true,
            }
          : emptyForm,
      );
    }
  }, [open, cliente]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        externalAccountId: form.externalAccountId.trim() || null,
        isActive: form.isActive,
      };
      return isEdit && cliente
        ? updateCorporateClient(cliente.id, base)
        : createCorporateClient({ ...base, code: form.code.trim() });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Cliente atualizado." : "Cliente criado.");
      await queryClient.invalidateQueries({ queryKey: ["corporate-clients"] });
      if (cliente) await queryClient.invalidateQueries({ queryKey: ["corporate-client", cliente.id] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Não foi possível salvar o cliente.")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEdit && !form.code.trim()) {
      setError("O código é obrigatório.");
      return;
    }
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
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "O código é imutável. Ajuste os demais dados do cliente."
              : "Cadastre um cliente no catálogo corporativo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cliente-code">Código {isEdit && "(imutável)"}</Label>
            <Input
              id="cliente-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="RM"
              maxLength={100}
              disabled={isEdit || mutation.isPending}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Para clientes do ClearID, use o nome do perfil no ClearID.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cliente-name">Nome</Label>
            <Input
              id="cliente-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="R&M Tecnologia"
              maxLength={200}
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cliente-account">AccountId do ClearID (opcional)</Label>
            <Input
              id="cliente-account"
              value={form.externalAccountId}
              onChange={(e) => set("externalAccountId", e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              maxLength={100}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              disabled={mutation.isPending}
              id="cliente-active"
            />
            <Label htmlFor="cliente-active">Ativo</Label>
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
