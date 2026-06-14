"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { BrandHeader } from "@/components/layout/brand-logo";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error ?? "فشل الدخول");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 login-panel-bg">
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="glass-card p-6 sm:p-8">
          <BrandHeader className="mb-8 border-b border-white/10 pb-8" />

          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-slate-400">أدخل بياناتك للوصول إلى لوحة التحكم</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="أدخل اسم المستخدم"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-600 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-600 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "دخول إلى النظام"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} تأهيل الاعمار — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
