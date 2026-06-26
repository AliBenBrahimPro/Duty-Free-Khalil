"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getNotificationSummary, markNotificationRead, markAllNotificationsRead, getConfig } from "./api";
import { useAuth } from "./auth-context";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  pendingPurchasesCount: number;
  deadline: string;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  pendingPurchasesCount: 0,
  deadline: "2026-07-08T23:59:59.000Z",
  panelOpen: false,
  setPanelOpen: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const BASE_POLL_INTERVAL = 10_000;
const MAX_POLL_INTERVAL = 60_000;

let notifAudio: HTMLAudioElement | null = null;

function playNotificationSound() {
  try {
    if (!notifAudio) {
      notifAudio = new Audio("/notification.mp3");
      notifAudio.volume = 0.6;
    }
    notifAudio.currentTime = 0;
    notifAudio.play().catch(() => {});
  } catch {
    // audio not available
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPurchasesCount, setPendingPurchasesCount] = useState(0);
  const [deadline, setDeadline] = useState("2026-07-08T23:59:59.000Z");
  const [panelOpen, setPanelOpen] = useState(false);
  const prevUnreadRef = useRef(0);
  const initializedRef = useRef(false);
  const failCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch config (deadline) once on login
  useEffect(() => {
    if (!user) return;
    getConfig()
      .then((cfg) => { if (cfg.deadline) setDeadline(cfg.deadline); })
      .catch(() => {});
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      // Single request replaces 3 separate calls
      const summary = await getNotificationSummary();
      setNotifications(summary.notifications);
      setUnreadCount(summary.unreadCount);
      setPendingPurchasesCount(summary.pendingPurchasesCount);

      // Play sound only when new unread notifications arrive (not on initial load)
      if (initializedRef.current && summary.unreadCount > prevUnreadRef.current) {
        playNotificationSound();
      }
      prevUnreadRef.current = summary.unreadCount;
      initializedRef.current = true;
      failCountRef.current = 0; // reset backoff on success
    } catch {
      failCountRef.current++;
      if (process.env.NODE_ENV === "development") {
        console.warn(`Notification poll failed (attempt ${failCountRef.current})`);
      }
    }
  }, [user]);

  // Poll with exponential backoff on failure
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPendingPurchasesCount(0);
      initializedRef.current = false;
      prevUnreadRef.current = 0;
      failCountRef.current = 0;
      return;
    }

    const poll = () => {
      refresh().finally(() => {
        const backoff = Math.min(
          BASE_POLL_INTERVAL * Math.pow(2, failCountRef.current),
          MAX_POLL_INTERVAL
        );
        timerRef.current = setTimeout(poll, backoff);
      });
    };

    poll();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, pendingPurchasesCount, deadline, panelOpen, setPanelOpen, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
