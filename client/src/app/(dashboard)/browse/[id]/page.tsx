"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getProduct, buyProduct, getProductPurchases, confirmPurchase, cancelPurchase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isSeller = user?.role === "SELLER" && product?.sellerId === user?.id;

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const p = await getProduct(id);
      setProduct(p);
      if (user?.role === "SELLER" && p.sellerId === user.id) {
        const purch = await getProductPurchases(id);
        setPurchases(purch);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    setActionLoading("buy");
    setError("");
    try {
      await buyProduct(id);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try {
      await confirmPurchase(purchaseId);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try {
      await cancelPurchase(purchaseId);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 pt-12 text-center animate-fade-in">
        <p className="text-rose-500 font-medium">{error || "Product not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-600 text-sm font-semibold">
          {t("detail.goBack")}
        </button>
      </div>
    );
  }

  const imgSrc = resolveImageUrl(product.image);
  const remaining = product.stock - product.sold;
  const soldOut = remaining <= 0;
  const isLimited = remaining > 0 && remaining <= 3;
  const isBuyer = user?.role === "BUYER";

  return (
    <div className="px-4 pt-6 pb-8 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm active:scale-95 transition"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1">{product.name}</h1>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl mb-4 border border-rose-100 animate-shake">
          {error}
        </div>
      )}

      {/* Product Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 overflow-hidden shadow-sm mb-4">
        {imgSrc && (
          <div className="w-full aspect-[4/3] bg-slate-100 relative">
            <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
            {soldOut && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg bg-red-500 px-4 py-2 rounded-xl">{t("products.soldOut")}</span>
              </div>
            )}
            {isLimited && !soldOut && (
              <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-lg">
                {t("products.limited")} — {remaining} {t("products.remaining")}
              </div>
            )}
          </div>
        )}
        <div className="p-5">
          <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
          {product.description && (
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("products.price")}</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{formatPrice(product.price, product.currency)}</p>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="flex-1 text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("products.stock")}</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${soldOut ? "text-red-500" : isLimited ? "text-amber-500" : "text-emerald-600"}`}>
                {remaining}
                <span className="text-sm font-medium text-slate-400 ml-1">/ {product.stock}</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            {t("detail.from")}: {product.seller.firstName} {product.seller.lastName}
          </p>
        </div>
      </div>

      {/* Buy Button (buyers only) */}
      {isBuyer && !soldOut && (
        <button
          onClick={handleBuy}
          disabled={actionLoading === "buy"}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-200/30 text-[15px] flex items-center justify-center gap-2 mb-4"
        >
          {actionLoading === "buy" ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              {t("products.buyNow")} — {formatPrice(product.price, product.currency)}
            </>
          )}
        </button>
      )}

      {isBuyer && soldOut && (
        <div className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl text-center text-[15px] mb-4">
          {t("products.soldOut")}
        </div>
      )}

      {/* Seller: Purchase Requests */}
      {isSeller && purchases.length > 0 && (
        <div className="mt-2">
          <h3 className="text-lg font-bold text-slate-900 mb-3">{t("products.purchases")}</h3>
          <div className="space-y-3">
            {purchases.map((p: any) => (
              <div key={p.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{p.buyer?.firstName?.charAt(0) || "?"}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.buyer?.firstName} {p.buyer?.lastName}</p>
                      <p className="text-[10px] text-slate-400">@{p.buyer?.username}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    p.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : p.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}>
                    {p.status}
                  </span>
                </div>

                {p.status === "PENDING" && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleConfirm(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition disabled:opacity-50"
                    >
                      {actionLoading === p.id ? "..." : t("products.confirm")}
                    </button>
                    <button
                      onClick={() => handleCancel(p.id)}
                      disabled={actionLoading === p.id}
                      className="flex-1 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl active:scale-[0.98] transition border border-rose-100 disabled:opacity-50"
                    >
                      {t("products.cancel")}
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-300 mt-2">{formatDate(p.createdAt, t)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSeller && purchases.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">{t("products.noPurchases")}</p>
      )}
    </div>
  );
}
