"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, getSellerPurchases } from "./api";
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
  panelOpen: false,
  setPanelOpen: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const POLL_INTERVAL = 10_000;

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
  const [panelOpen, setPanelOpen] = useState(false);
  const prevUnreadRef = useRef(0);
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [notifs, { count }] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);

      // Fetch pending purchases count for sellers
      if (user.role === "SELLER") {
        try {
          const purchases = await getSellerPurchases();
          setPendingPurchasesCount(purchases.filter((p: any) => p.status === "PENDING").length);
        } catch { /* ignore */ }
      }

      // Play sound only when new unread notifications arrive (not on initial load)
      if (initializedRef.current && count > prevUnreadRef.current) {
        playNotificationSound();
      }
      prevUnreadRef.current = count;
      initializedRef.current = true;
    } catch {
      // ignore errors silently
    }
  }, [user]);

  // Poll for notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPendingPurchasesCount(0);
      initializedRef.current = false;
      prevUnreadRef.current = 0;
      return;
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
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
    <NotificationContext.Provider value={{ notifications, unreadCount, pendingPurchasesCount, panelOpen, setPanelOpen, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
