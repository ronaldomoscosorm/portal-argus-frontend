import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe } from "@/api/me";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/api/client";
import type { MeDto } from "@/api/types";
import { isPortalAdminUser } from "@/lib/portalAdmin";

interface AuthContextValue {
  user: MeDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Verdadeiro se o usuário tem o app `portal` com perfil `Administrator` (console admin). */
  isAdmin: boolean;
  setSession: (accessToken: string, refreshToken: string | null) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (err) {
      console.error(
        "[portal] fetchMe falhou — limpando sessão:",
        err instanceof Error ? err.message : String(err),
      );
      setUser(null);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const setSession = useCallback(
    async (accessToken: string, refreshToken: string | null) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      setLoading(true);
      await loadUser();
    },
    [loadUser],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: isPortalAdminUser(user),
      setSession,
      logout,
      refreshUser: loadUser,
    }),
    [user, loading, setSession, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}
