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
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
