import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginAdmin, type AdminSession } from "./authApi";
import {
  getStoredSession,
  setStoredSession,
  type StoredAdminSession,
} from "./authClient";

type AuthState = {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  admin: StoredAdminSession | null;
  adminEmail: string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<StoredAdminSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const stored = getStoredSession();

    if (stored) {
      setAdmin(stored);
    }

    setIsBootstrapping(false);
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const session = (await loginAdmin(identifier, password)) as AdminSession;
    const normalized: StoredAdminSession = {
      id: session.id,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
      token: session.token,
    };

    setAdmin(normalized);
    setStoredSession(normalized);
  }, []);

  const signOut = useCallback(() => {
    setAdmin(null);
    setStoredSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: Boolean(admin && admin.role === "admin"),
      isBootstrapping,
      admin,
      adminEmail: admin?.email || null,
      signIn,
      signOut,
    }),
    [admin, isBootstrapping, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
