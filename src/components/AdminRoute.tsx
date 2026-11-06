import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/PageState";

/**
 * Guarda das rotas administrativas: exige autenticação E o app `portal` com perfil
 * `Administrator` (ver `lib/portalAdmin`).
 * Não-admin é redirecionado para o painel (/). A segurança real é garantida no
 * backend; aqui apenas escondemos as telas.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  // eslint-disable-next-line no-console
  console.log("[portal] AdminRoute check", {
    loading,
    isAuthenticated,
    isAdmin,
    apps: user?.apps?.map((a) => `${a.code}:${a.profile ? JSON.stringify(a.profile) : "-"}`),
  });

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    // eslint-disable-next-line no-console
    console.warn("[portal] AdminRoute — não autenticado → /login");
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    // eslint-disable-next-line no-console
    console.warn("[portal] AdminRoute — sem perfil portal:Administrator → /");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
