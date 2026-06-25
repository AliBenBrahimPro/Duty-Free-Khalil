"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getRequest, setPrice, markUnavailable, acceptPrice, rejectPrice, deleteRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import StatusBadge from "@/components/status-badge";
import { formatPrice, formatFullDate, timeUntilDeadline, resolveImageUrl } from "@/lib/utils";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    getRequest(id).then(setRequest).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (action: () => Promise<any>) => {
    setActionLoading(true); setError("");
    try { await action(); const updated = await getRequest(id); setRequest(updated); }
    catch (err: any) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try { await deleteRequest(id); router.push("/requests"); }
    catch (err: any) { setError(err.message); setShowDelete(false); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!request) return (
    <div className="px-4 pt-12 text-center animate-fade-in">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <p className="text-rose-500 font-medium">{error || t("detail.notFound")}</p>
      <button onClick={() => router.back()} className="mt-4 text-indigo-600 text-sm font-semibold">{t("detail.goBack")}</button>
    </div>
  );

  const isAdmin = user?.role === "SUPERADMIN";
  const isSeller = user?.role === "SELLER" || isAdmin;
  const isBuyer = user?.role === "BUYER" || isAdmin;
  const canDelete = isAdmin || request.buyerId === user?.id || request.sellerId === user?.id;
  const imgSrc = resolveImageUrl(request.productImage);

  return (
    <div className="px-4 pt-6 pb-8 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-slide-up">{toast}</div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">{t("detail.delete")}</h3>
            <p className="text-sm text-slate-500 text-center mb-5">{t("detail.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl">{t("detail.cancel")}</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-3 bg-rose-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {actionLoading ? "..." : t("detail.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm active:scale-95 transition">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">{t("detail.title")}</h1>
        <StatusBadge status={request.status} />
        {canDelete && (
          <button onClick={() => setShowDelete(true)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center active:scale-95 transition">
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl mb-4 border border-rose-100 animate-shake">{error}</div>}

      {/* Product Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-sm border border-white/60 mb-4">
        {imgSrc && (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-slate-100 relative">
            <img src={imgSrc} alt={request.productName || "Product"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        <div className="p-5">
          <h2 className="text-xl font-bold text-slate-900">{request.productName || "Product Image"}</h2>
          {request.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{request.description}</p>}

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("detail.from")}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{request.buyer.firstName} {request.buyer.lastName}</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("detail.to")}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{request.seller.firstName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-300">{formatFullDate(request.createdAt)}</span>
            <span className="text-xs text-amber-500 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg">{timeUntilDeadline(t)}</span>
          </div>
        </div>
      </div>

      {/* Price Display */}
      {request.price && (
        <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 rounded-2xl p-5 mb-4 text-white shadow-lg shadow-indigo-200/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-100 font-medium">{t("detail.price")}</p>
              <p className="text-4xl font-extrabold tracking-tight mt-1">{formatPrice(request.price, request.currency)}</p>
            </div>
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmed */}
      {request.order && (
        <div className="bg-emerald-50 rounded-2xl p-5 mb-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-800">{t("detail.purchaseConfirmed")}</p>
              <p className="text-sm text-emerald-600 mt-0.5">{formatFullDate(request.order.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* SELLER / ADMIN ACTIONS */}
      {isSeller && request.status === "PENDING_PRICE" && (
        <div className="space-y-3 animate-slide-up">
          {showPriceInput ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-5 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-3">{t("detail.enterPrice")}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-semibold">DT</span>
                  <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="0" min="1" autoFocus
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-lg font-bold text-slate-900 placeholder:text-slate-200" />
                </div>
                <button onClick={() => handleAction(() => setPrice(id, parseFloat(priceInput)))} disabled={actionLoading || !priceInput}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition-all shadow-md">
                  {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t("detail.send")}
                </button>
              </div>
              <button onClick={() => setShowPriceInput(false)} className="text-sm text-slate-400 mt-3 font-medium">{t("detail.cancel")}</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowPriceInput(true)}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-indigo-200/30 text-[15px]">
                {t("detail.givePrice")}
              </button>
              <button onClick={() => handleAction(() => markUnavailable(id))} disabled={actionLoading}
                className="w-full py-4 bg-white/80 border border-slate-200 text-slate-600 font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50">
                {actionLoading ? "..." : t("detail.notAvailable")}
              </button>
            </>
          )}
        </div>
      )}

      {/* BUYER / ADMIN ACTIONS */}
      {isBuyer && request.status === "PRICED" && (
        <div className="space-y-3 animate-slide-up">
          <button onClick={() => handleAction(() => acceptPrice(id))} disabled={actionLoading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-200/30 text-[15px] flex items-center justify-center gap-2">
            {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
              <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>{t("detail.acceptBuy")}</>
            )}
          </button>
          <button onClick={() => handleAction(() => rejectPrice(id))} disabled={actionLoading}
            className="w-full py-4 bg-rose-50 text-rose-600 font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 border border-rose-100">
            {t("detail.rejectPrice")}
          </button>
        </div>
      )}

      {/* Admin badge */}
      {isAdmin && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-center">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">SUPERADMIN VIEW</span>
        </div>
      )}
    </div>
  );
}
