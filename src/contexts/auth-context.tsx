"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, type User } from "@/lib/api";
import { canViewProjectsModule } from "@/lib/permissions";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ["/login"];
const PROJECTS_MODULE_PATH = /^\/projects(\/|$)/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("jade_token");
    if (!stored) {
      setLoading(false);
      if (!PUBLIC_PATHS.includes(pathname)) router.replace("/login");
      return;
    }
    setToken(stored);
    api.me(stored)
      .then((u) => {
        setUser(u);
        if (pathname === "/login") router.replace("/");
        else if (PROJECTS_MODULE_PATH.test(pathname) && !canViewProjectsModule(u.role)) {
          router.replace("/");
        }
      })
      .catch(() => {
        localStorage.removeItem("jade_token");
        setToken(null);
        if (!PUBLIC_PATHS.includes(pathname)) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await api.login(username, password);
      localStorage.setItem("jade_token", result.token);
      setToken(result.token);
      setUser(result);
      router.replace("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "فشل الدخول" };
    }
  }, [router]);

  const logout = useCallback(async () => {
    if (token) await api.logout(token).catch(() => {});
    localStorage.removeItem("jade_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [token, router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
