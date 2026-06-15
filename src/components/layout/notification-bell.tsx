"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api, type NotificationItem } from "@/lib/api";
import { toAppPath } from "@/lib/nav";

export function NotificationBell() {
  const { token } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!token) return;
    api.notifications(token).list().then((r) => {
      setItems(r.items);
      setUnread(r.unreadCount);
    }).catch(() => {});
  }, [token]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: number) => {
    if (!token) return;
    await api.notifications(token).markRead(id);
    load();
  };

  const markAll = async () => {
    if (!token) return;
    await api.notifications(token).markAllRead();
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 glass-card p-0 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="font-bold text-white text-sm">الإشعارات</span>
            {unread > 0 && (
              <button onClick={markAll} className="erp-link text-xs flex items-center gap-1">
                <Check className="h-3 w-3" /> قراءة الكل
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">لا توجد إشعارات</p>
            ) : items.slice(0, 15).map((n) => (
              <div
                key={n.id}
                className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer ${!n.isRead ? "bg-blue-500/5" : ""}`}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) {
                    setOpen(false);
                    router.push(toAppPath(n.link));
                  }
                }}
              >
                <p className="text-sm font-semibold text-white">{n.title}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
