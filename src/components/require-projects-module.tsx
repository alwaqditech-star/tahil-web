"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canViewProjectsModule } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

export function RequireProjectsModule({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !canViewProjectsModule(user.role)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || !canViewProjectsModule(user.role)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
