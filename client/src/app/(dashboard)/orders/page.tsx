"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOrders, getOrderStats, getSellerPurchases, getMyPurchases, confirmPurchase, cancelPurchase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";

type Tab = "orders" | "purchases";

export default function OrdersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, totalRevenue: 0 });
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const isSeller = user?.role === "SELLER";
  const isBuyer = user?.role === "BUYER";
  const isAdmin = user?.role === "SUPERADMIN";

  const loadData = async () => {
    try {
      const [o, s] = await Promise.all([getOrders(), getOrderStats()]);
      setOrders(o);
      setStats(s);

      if (isSeller) {
        const p = await getSellerPurchases();
        setPurchases(p);
      } else if (isBuyer) {
        const p = await getMyPurchases();
        setPurchases(p);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const pendingCount = purchases.filter((p: any) => p.status === "PENDING").length;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleConfirm = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try {
      await confirmPurchase(purchaseId);
      await loadData();
      showToast(t("purchases.confirmed"));
    } catch (err: any) { showToast(err.message); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try {
      await cancelPurchase(purchaseId);
      await loadData();
      showToast(t("purchases.cancelled"));
    } catch (err: any) { showToast(err.message); }
    finally { setActionLoading(null); }
  };

  // Auto-switch to purchases tab if there are pending purchases and no orders
  useEffect(() => {
    if (!loading && isSeller && pendingCount > 0 && orders.length === 0) {
      setTab("purchases");
    }
  }, [loading, isSeller, pendingCount, orders.length]);

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-slide-up">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-extrabold text-slate-900 mb-5">{t("orders.title")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t("orders.total")}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-emerald-600">{stats.confirmed}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t("orders.confirmed")}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-center shadow-md shadow-indigo-200/30">
          <p className="text-2xl font-extrabold text-white">{formatPrice(stats.totalRevenue)}</p>
          <p className="text-[11px] text-indigo-200 font-medium mt-0.5">
            {isSeller ? t("orders.revenue") : t("orders.spent")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {!isAdmin && (
        <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "orders" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
            }`}
          >
            {t("orders.title")} ({orders.length})
          </button>
          <button
            onClick={() => setTab("purchases")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${
              tab === "purchases" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
            }`}
          >
            {isSeller ? t("purchases.title") : t("purchases.myPurchases")}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-notif-pop">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "orders" ? (
        /* --- ORDERS TAB --- */
        orders.length === 0 ? (
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
        )
      ) : (
        /* --- PURCHASES TAB --- */
        <PurchasesTab
          purchases={purchases}
          isSeller={isSeller || false}
          actionLoading={actionLoading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          t={t}
          user={user}
        />
      )}
    </div>
  );
}

function PurchasesTab({ purchases, isSeller, actionLoading, onConfirm, onCancel, t, user }: {
  purchases: any[];
  isSeller: boolean;
  actionLoading: string | null;
  onConfirm: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  t: any;
  user: any;
}) {
  const pending = purchases.filter(p => p.status === "PENDING");
  const handled = purchases.filter(p => p.status !== "PENDING");

  if (purchases.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <p className="text-slate-400 font-medium">{t("purchases.noPurchases")}</p>
      </div>
    );
  }

  return (
    <div className="pb-4 animate-fade-in">
      {/* Pending section — highlighted */}
      {pending.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">
              {t("purchases.pending")} ({pending.length})
            </h3>
          </div>
          <div className="space-y-3 mb-6">
            {pending.map((p: any, i: number) => (
              <PurchaseCard
                key={p.id}
                purchase={p}
                isSeller={isSeller}
                actionLoading={actionLoading}
                onConfirm={onConfirm}
                onCancel={onCancel}
                t={t}
                user={user}
                index={i}
                urgent
              />
            ))}
          </div>
        </>
      )}

      {/* Handled section */}
      {handled.length > 0 && (
        <>
          {pending.length > 0 && (
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              {t("purchases.history")} ({handled.length})
            </h3>
          )}
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {handled.map((p: any, i: number) => (
              <PurchaseCard
                key={p.id}
                purchase={p}
                isSeller={isSeller}
                actionLoading={actionLoading}
                onConfirm={onConfirm}
                onCancel={onCancel}
                t={t}
                user={user}
                index={i}
                urgent={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PurchaseCard({ purchase: p, isSeller, actionLoading, onConfirm, onCancel, t, user, index, urgent }: {
  purchase: any;
  isSeller: boolean;
  actionLoading: string | null;
  onConfirm: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  t: any;
  user: any;
  index: number;
  urgent: boolean;
}) {
  const imgSrc = resolveImageUrl(p.product?.image);
  const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: t("purchases.statusPending") },
    CONFIRMED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: t("purchases.statusConfirmed") },
    CANCELLED: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: t("purchases.statusCancelled") },
    SOLD_OUT: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", label: t("purchases.statusSoldOut") },
  };
  const sc = statusConfig[p.status] || statusConfig.PENDING;

  return (
    <Link href={`/browse/${p.product?.id || p.productId}`}>
      <div
        className={`rounded-2xl border p-4 shadow-sm animate-slide-up h-full transition-all active:scale-[0.98] ${
          urgent
            ? "bg-amber-50/60 border-amber-200 pulse-glow"
            : "bg-white/90 backdrop-blur-sm border-white/60"
        }`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start gap-3">
          {imgSrc ? (
            <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm">
              <img src={imgSrc} alt={p.product?.name || "Product"} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-semibold text-indigo-400">
                {(p.product?.name || "P").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-[15px] truncate">
                {p.product?.name || "Product"}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${sc.bg} ${sc.text} ${sc.border}`}>
                {sc.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {isSeller
                  ? `${p.buyer?.firstName || "?"} ${p.buyer?.lastName || ""}`
                  : p.product?.name || ""}
                <span className="mx-1 text-slate-200">|</span>
                {formatDate(p.createdAt, t)}
              </span>
              <span className="text-base font-extrabold text-indigo-600">
                {formatPrice(p.product?.price, p.product?.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Seller action buttons for pending purchases */}
        {isSeller && p.status === "PENDING" && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-amber-100">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(p.id); }}
              disabled={actionLoading === p.id}
              className="flex-1 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {actionLoading === p.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {t("products.confirm")}
                </>
              )}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(p.id); }}
              disabled={actionLoading === p.id}
              className="flex-1 py-2.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl active:scale-[0.98] transition border border-rose-100 disabled:opacity-50"
            >
              {t("products.cancel")}
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
