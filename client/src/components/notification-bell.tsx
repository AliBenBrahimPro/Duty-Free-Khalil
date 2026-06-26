"use client";

import { useNotifications } from "@/lib/notification-context";

export default function NotificationBell() {
  const { unreadCount, setPanelOpen } = useNotifications();

  return (
    <button
      onClick={() => setPanelOpen(true)}
      className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm active:scale-95 transition"
    >
      <svg
        className={`w-5 h-5 ${unreadCount > 0 ? "text-indigo-600" : "text-slate-500"}`}
        fill={unreadCount > 0 ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={unreadCount > 0 ? 0 : 1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-notif-pop">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
