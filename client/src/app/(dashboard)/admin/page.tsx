"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { getAdminUsers, getAdminStats } from "@/lib/api";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users">("overview");

  useEffect(() => {
    if (user && user.role !== "SUPERADMIN") {
      router.replace("/requests");
      return;
    }
    Promise.all([getAdminUsers(), getAdminStats()])
      .then(([u, s]) => {
        setUsers(u);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== "SUPERADMIN") return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: t("admin.totalUsers"), value: stats.totalUsers, color: "text-slate-900", bg: "bg-white/80" },
        { label: t("admin.buyers"), value: stats.totalBuyers, color: "text-blue-600", bg: "bg-blue-50" },
        { label: t("admin.sellers"), value: stats.totalSellers, color: "text-violet-600", bg: "bg-violet-50" },
        { label: t("admin.totalRequests"), value: stats.totalRequests, color: "text-slate-900", bg: "bg-white/80" },
        { label: t("admin.pendingRequests"), value: stats.pendingRequests, color: "text-amber-600", bg: "bg-amber-50" },
        { label: t("admin.totalOrders"), value: stats.totalOrders, color: "text-emerald-600", bg: "bg-emerald-50" },
      ]
    : [];

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{t("admin.title")}</h1>
        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
          SUPERADMIN
        </span>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab("overview")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "overview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "users" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
          }`}
        >
          {t("admin.users")}
        </button>
      </div>

      {tab === "overview" && stats && (
        <div className="animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className={`${s.bg} backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm`}>
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue Card */}
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-indigo-200/30">
            <p className="text-sm text-indigo-100 font-medium">{t("admin.totalRevenue")}</p>
            <p className="text-4xl font-extrabold tracking-tight mt-1">
              {formatPrice(stats.totalRevenue)}
            </p>
            <p className="text-indigo-200 text-sm mt-2">
              {stats.totalOrders} {t("admin.totalOrders").toLowerCase()}
            </p>
          </div>

          {/* Status Breakdown */}
          {stats.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">{t("admin.totalRequests")} by Status</h3>
              <div className="space-y-2">
                {Object.entries(stats.statusCounts).map(([status, count]) => {
                  const pct = stats.totalRequests > 0 ? ((count as number) / stats.totalRequests) * 100 : 0;
                  const colors: Record<string, string> = {
                    PENDING_PRICE: "bg-amber-400",
                    PRICED: "bg-indigo-400",
                    CONFIRMED: "bg-emerald-400",
                    UNAVAILABLE: "bg-slate-300",
                    REJECTED: "bg-rose-400",
                    EXPIRED: "bg-orange-400",
                    CANCELLED: "bg-slate-300",
                  };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-28 truncate">{status.replace("_", " ")}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[status] || "bg-slate-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{count as number}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="animate-fade-in">
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {users.map((u, i) => {
              const avatar = resolveImageUrl(u.profileImage);
              const reqCount = (u._count?.buyerRequests || 0) + (u._count?.sellerRequests || 0);
              const orderCount = (u._count?.orders || 0) + (u._count?.sellerOrders || 0);
              return (
                <div
                  key={u.id}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm animate-slide-up h-full"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {avatar ? (
                      <img src={avatar} alt={u.firstName} className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold ${
                        u.role === "SUPERADMIN"
                          ? "bg-gradient-to-br from-red-500 to-pink-600"
                          : u.role === "SELLER"
                            ? "bg-gradient-to-br from-violet-500 to-purple-600"
                            : "bg-gradient-to-br from-indigo-500 to-blue-600"
                      }`}>
                        {u.firstName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      u.role === "SUPERADMIN"
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : u.role === "SELLER"
                          ? "bg-violet-50 text-violet-600 border border-violet-200"
                          : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                    }`}>
                      {u.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                      <span className="text-slate-400">
                        {t("admin.requestsMade")}: <span className="font-semibold text-slate-600">{reqCount}</span>
                      </span>
                      <span className="text-slate-400">
                        {t("admin.ordersMade")}: <span className="font-semibold text-slate-600">{orderCount}</span>
                      </span>
                    </div>
                    <span className="text-slate-300">{formatDate(u.createdAt, t)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
