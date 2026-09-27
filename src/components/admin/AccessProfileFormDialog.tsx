import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAppProfile, updateAccessProfile } from "@/api/accessProfiles";
import type { AccessProfileDto } from "@/api/types";
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
  applicationId: number;
  /** Presente = edição; ausente = criação. */
  profile?: AccessProfileDto | null;
}

export function AccessProfileFormDialog({ open, onOpenChange, applicationId, profile }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(profile);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setName(profile?.name ?? "");
      setDescription(profile?.description ?? "");
      setIsActive(profile?.isActive ?? true);
    }
  }, [open, profile]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
      };
      return isEdit && profile
        ? updateAccessProfile(profile.id, payload)
        : createAppProfile(applicationId, payload);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Perfil atualizado." : "Perfil criado.");
      await queryClient.invalidateQueries({ queryKey: ["app-profiles", applicationId] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Não foi possível salvar o perfil.")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("O nome do perfil é obrigatório.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar perfil" : "Novo perfil de acesso"}</DialogTitle>
          <DialogDescription>
            O perfil é um rótulo. As permissões efetivas são definidas dentro do próprio
            aplicativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="profileName">Nome</Label>
            <Input
              id="profileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Operador"
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profileDesc">Descrição</Label>
            <Textarea
              id="profileDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="profileActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={mutation.isPending}
            />
            <Label htmlFor="profileActive">Ativo</Label>
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
