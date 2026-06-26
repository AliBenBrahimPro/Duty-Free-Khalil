"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/notification-context";
import { useI18n } from "@/lib/i18n";

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  REQUEST_NEW: { icon: "M12 4.5v15m7.5-7.5h-15", color: "text-indigo-600", bg: "bg-indigo-50" },
  REQUEST_PRICED: { icon: "M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z", color: "text-violet-600", bg: "bg-violet-50" },
  REQUEST_UNAVAILABLE: { icon: "M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636", color: "text-amber-600", bg: "bg-amber-50" },
  REQUEST_ACCEPTED: { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "text-emerald-600", bg: "bg-emerald-50" },
  REQUEST_REJECTED: { icon: "M9.75 9.75l4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "text-rose-600", bg: "bg-rose-50" },
  REQUEST_COMMENT: { icon: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z", color: "text-blue-600", bg: "bg-blue-50" },
  PRODUCT_PURCHASE: { icon: "M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z", color: "text-indigo-600", bg: "bg-indigo-50" },
  PURCHASE_CONFIRMED: { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "text-emerald-600", bg: "bg-emerald-50" },
  PURCHASE_CANCELLED: { icon: "M9.75 9.75l4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "text-rose-600", bg: "bg-rose-50" },
  PRODUCT_COMMENT: { icon: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z", color: "text-blue-600", bg: "bg-blue-50" },
};

const DEFAULT_ICON = { icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0", color: "text-slate-600", bg: "bg-slate-50" };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationPanel() {
  const router = useRouter();
  const { t } = useI18n();
  const { notifications, unreadCount, panelOpen, setPanelOpen, markRead, markAllRead } = useNotifications();

  if (!panelOpen) return null;

  const handleClick = async (n: any) => {
    if (!n.read) await markRead(n.id);
    setPanelOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setPanelOpen(false)} />

      {/* Panel */}
      <div className="fixed z-[61] top-0 right-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl animate-notif-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{t("notif.title")}</h2>
            {unreadCount > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition px-2 py-1"
              >
                {t("notif.markAllRead")}
              </button>
            )}
            <button
              onClick={() => setPanelOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 active:scale-95 transition"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <p className="text-sm font-medium">{t("notif.empty")}</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => {
                const typeInfo = TYPE_ICONS[n.type] || DEFAULT_ICON;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all active:bg-slate-50 border-b border-slate-50 ${
                      !n.read ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${typeInfo.bg}`}>
                      <svg className={`w-4.5 h-4.5 ${typeInfo.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={typeInfo.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                          {n.title}
                        </p>
                        {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
