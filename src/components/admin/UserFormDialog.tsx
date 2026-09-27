import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createUser, updateUser } from "@/api/users";
import type { MfaMethod, UserDto } from "@/api/types";
import { toApiErrorMessage } from "@/api/client";
import { MFA_METHOD_OPTIONS, isE164 } from "@/lib/labels";
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
  /** Presente = edição; ausente = criação. */
  user?: UserDto | null;
}

type FormState = {
  name: string;
  userName: string;
  password: string;
  confirm: string;
  /** No modo criação: se true, oculta senha e o servidor envia link ao usuário. */
  sendResetLink: boolean;
  mfaMethod: MfaMethod;
  phoneNumber: string;
  isAdSynced: boolean;
};

const emptyForm: FormState = {
  name: "",
  userName: "",
  password: "",
  confirm: "",
  sendResetLink: true,
  mfaMethod: "None",
  phoneNumber: "",
  isAdSynced: false,
};

export function UserFormDialog({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(user);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        user
          ? {
              name: user.name ?? "",
              userName: user.userName,
              password: "",
              confirm: "",
              sendResetLink: false,
              mfaMethod: user.mfaMethod,
              phoneNumber: user.phoneNumber ?? "",
              isAdSynced: user.isAdSynced,
            }
          : emptyForm,
      );
    }
  }, [open, user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        userName: form.userName.trim(),
        mfaMethod: form.mfaMethod,
        phoneNumber: form.mfaMethod === "Sms" ? form.phoneNumber.trim() : null,
        isAdSynced: form.isAdSynced,
      };
      if (isEdit && user) {
        return updateUser(user.id, {
          ...base,
          password: form.password ? form.password : null,
        });
      }
      if (form.sendResetLink) {
        return createUser({
          ...base,
          sendResetLink: true,
        });
      }
      return createUser({
        ...base,
        password: form.password,
        confirmPassword: form.confirm,
      });
    },
    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Usuário atualizado."
          : form.sendResetLink
            ? "Usuário criado. Link para definir senha enviado por e-mail."
            : "Usuário criado.",
      );
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      if (user) await queryClient.invalidateQueries({ queryKey: ["user", user.id] });
      onOpenChange(false);
    },
    onError: (err) => setError(toApiErrorMessage(err, "Não foi possível salvar o usuário.")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.userName.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.userName.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!isEdit && !form.sendResetLink) {
      if (form.password.length < 8) {
        setError("A senha deve ter ao menos 8 caracteres.");
        return;
      }
      if (form.password !== form.confirm) {
        setError("As senhas não coincidem.");
        return;
      }
    }
    if (isEdit && form.password && form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (form.mfaMethod === "Sms" && !isE164(form.phoneNumber)) {
      setError("Para SMS, informe um telefone E.164 (ex.: +5511999998888).");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Deixe a senha em branco para mantê-la inalterada."
              : "Cadastre um usuário no Portal Argus."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userName">E-mail (login)</Label>
              <Input
                id="userName"
                type="email"
                value={form.userName}
                onChange={(e) => set("userName", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
              <Switch
                id="sendResetLink"
                checked={form.sendResetLink}
                onCheckedChange={(v) => set("sendResetLink", v)}
                disabled={mutation.isPending}
              />
              <div className="space-y-0.5">
                <Label htmlFor="sendResetLink" className="cursor-pointer">
                  Enviar link para o usuário definir a senha
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recomendado. Um e-mail com link temporário será enviado assim que o
                  usuário for criado. Desmarque para definir a senha manualmente agora.
                </p>
              </div>
            </div>
          )}

          {(isEdit || !form.sendResetLink) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">{isEdit ? "Nova senha" : "Senha"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  placeholder={isEdit ? "(manter atual)" : ""}
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  autoComplete="new-password"
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Método de 2FA</Label>
              <Select
                value={form.mfaMethod}
                onValueChange={(v) => set("mfaMethod", v as MfaMethod)}
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
            </div>
            {form.mfaMethod === "Sms" && (
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber">Telefone (E.164)</Label>
                <Input
                  id="phoneNumber"
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  placeholder="+5511999998888"
                  disabled={mutation.isPending}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isAdSynced"
              checked={form.isAdSynced}
              onCheckedChange={(v) => set("isAdSynced", v)}
              disabled={mutation.isPending}
            />
            <Label htmlFor="isAdSynced">Sincronizado com AD</Label>
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
