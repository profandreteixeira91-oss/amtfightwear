import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Package } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/store/notifications.functions";

type Notification = {
  id: string;
  order_id: string | null;
  event: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationsBell({ authed }: { authed: boolean }) {
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  const load = () => {
    if (!authed) return;
    list()
      .then((rows) => setItems((rows ?? []) as Notification[]))
      .catch(() => {});
  };

  useEffect(() => {
    if (!authed) {
      setItems([]);
      return;
    }
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!authed) return null;
  const unread = items.filter((i) => !i.read_at).length;

  const onOpen = () => {
    setOpen((v) => !v);
    if (!open) load();
  };

  const onItemClick = async (n: Notification) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      try {
        await markRead({ data: { id: n.id } });
      } catch {
        /* noop */
      }
    }
    setOpen(false);
  };

  const onMarkAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    try {
      await markAll();
    } catch {
      /* noop */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="relative inline-flex items-center rounded-md px-2 py-2 hover:bg-accent"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[340px] max-w-[90vw] rounded-md border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-bold">Notificações</div>
            {items.some((i) => !i.read_at) && (
              <button
                type="button"
                onClick={onMarkAll}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Você ainda não tem notificações.
              </div>
            ) : (
              items.map((n) => {
                const content = (
                  <div
                    className={`flex flex-col gap-1 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-accent ${
                      n.read_at ? "" : "bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold leading-tight">{n.title}</div>
                      <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                  </div>
                );
                return n.order_id ? (
                  <Link
                    key={n.id}
                    to="/loja/pedido/$id"
                    params={{ id: n.order_id }}
                    onClick={() => onItemClick(n)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onItemClick(n)}
                    className="block w-full text-left"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t px-3 py-2 text-center">
            <Link
              to="/loja/conta/pedidos"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver meus pedidos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
