import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { LoginPage } from "@/pages/LoginPage";
import { LogoutPage } from "@/pages/LogoutPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { NotFound } from "@/pages/NotFound";
import { AdminHomePage } from "@/pages/admin/AdminHomePage";
import { AppsListPage } from "@/pages/admin/AppsListPage";
import { AppDetailPage } from "@/pages/admin/AppDetailPage";
import { UsersListPage } from "@/pages/admin/UsersListPage";
import { UserDetailPage } from "@/pages/admin/UserDetailPage";
import { UsersBulkPage } from "@/pages/admin/UsersBulkPage";
import { ClientesListPage } from "@/pages/admin/ClientesListPage";
import { ClienteDetailPage } from "@/pages/admin/ClienteDetailPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Autenticado */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security"
          element={
            <ProtectedRoute>
              <SecurityPage />
            </ProtectedRoute>
          }
        />

        {/* Administração (role Administrator) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminHomePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/apps"
          element={
            <AdminRoute>
              <AppsListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/apps/:id"
          element={
            <AdminRoute>
              <AppDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UsersListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/bulk"
          element={
            <AdminRoute>
              <UsersBulkPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <AdminRoute>
              <UserDetailPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/clientes"
          element={
            <AdminRoute>
              <ClientesListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/clientes/:id"
          element={
            <AdminRoute>
              <ClienteDetailPage />
            </AdminRoute>
          }
        />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
