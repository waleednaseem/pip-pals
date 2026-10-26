import { clearLocalAppData, loadUserHistory } from "@/lib/appHistory";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AccountUser = {
  email: string;
  username: string;
};

type AuthContextValue = {
  user: AccountUser | null;
  loading: boolean;
  historyReady: boolean;
  signup: (input: { email: string; username: string; password: string }) => Promise<string | null>;
  login: (input: { login: string; password: string }) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function postAccount(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    return { user: null as AccountUser | null, error: data?.error || "Something went wrong." };
  }
  return { user: data.user as AccountUser, error: null as string | null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const data = await response.json();
        if (!cancelled && response.ok && data?.ok && data.user) setUser(data.user);
      } catch {
        /* stay signed out */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setHistoryReady(false);
      return;
    }
    let cancelled = false;
    setHistoryReady(false);
    void loadUserHistory().finally(() => {
      if (!cancelled) setHistoryReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      historyReady,
      signup: async (input) => {
        const result = await postAccount("/api/auth/signup", input);
        if (result.user) setUser(result.user);
        return result.error;
      },
      login: async (input) => {
        const result = await postAccount("/api/auth/login", input);
        if (result.user) setUser(result.user);
        return result.error;
      },
      logout: async () => {
        clearLocalAppData();
        setUser(null);
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
      },
    }),
    [user, loading, historyReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
