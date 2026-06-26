"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/bottom-nav";
import Sidebar from "@/components/sidebar";
import NotificationPanel from "@/components/notification-panel";
import { useI18n } from "@/lib/i18n";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">{t("general.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col pb-20 lg:pb-0 min-h-screen overflow-x-hidden">
        <div className="flex-1 w-full max-w-full">{children}</div>
      </div>
      <BottomNav />
      <NotificationPanel />
    </div>
  );
}
