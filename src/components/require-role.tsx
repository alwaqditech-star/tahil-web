"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export function RequireRole({ allow, children }: { allow: (role: string) => boolean; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !allow(user.role)) router.replace("/");
  }, [user, loading, allow, router]);

  if (loading || !user || !allow(user.role)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin spinner-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
