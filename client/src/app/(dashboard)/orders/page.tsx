"use client";

import { useState, useEffect } from "react";
import { getOrders, getOrderStats } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";

export default function OrdersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrders(), getOrderStats()])
      .then(([o, s]) => {
        setOrders(o);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isSeller = user?.role === "SELLER";

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-5">{t("orders.title")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t("orders.total")}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-emerald-600">{stats.confirmed}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t("orders.confirmed")}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-center shadow-md shadow-indigo-200/30">
          <p className="text-2xl font-extrabold text-white">
            {formatPrice(stats.totalRevenue)}
          </p>
          <p className="text-[11px] text-indigo-200 font-medium mt-0.5">
            {isSeller ? t("orders.revenue") : t("orders.spent")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">{t("orders.noOrders")}</p>
          <p className="text-xs text-slate-300 mt-1">{t("orders.noOrdersDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
          {orders.map((order, i) => {
            const imgSrc = resolveImageUrl(order.request?.productImage);
            return (
              <div
                key={order.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm animate-slide-up h-full"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  {imgSrc ? (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm">
                      <img src={imgSrc} alt={order.request?.productName || "Product"} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-indigo-400">
                        {(order.request?.productName || "P").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 text-[15px] truncate">
                        {order.request?.productName || "Product"}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {t("status.confirmed")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {isSeller
                          ? `${order.buyer.firstName} ${order.buyer.lastName}`
                          : order.seller.firstName}
                        <span className="mx-1 text-slate-200">|</span>
                        {formatDate(order.createdAt, t)}
                      </span>
                      <span className="text-lg font-extrabold text-indigo-600">
                        {formatPrice(order.price, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
