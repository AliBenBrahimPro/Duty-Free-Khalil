"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getProducts, buyProduct } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";
import ErrorState from "@/components/error-state";
import LoadMore from "@/components/load-more";

export default function BrowsePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const isSeller = user?.role === "SELLER";

  const loadData = useCallback(async (cursor?: string, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(false);
      const result = await getProducts({ cursor });
      if (append) {
        setProducts((prev) => [...prev, ...result.data]);
      } else {
        setProducts(result.data);
      }
      setNextCursor(result.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    loadData(nextCursor, true);
  };

  const handleBuy = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBuyingId(productId);
    try {
      await buyProduct(productId);
      await loadData();
      setToast(t("products.requested"));
      setTimeout(() => setToast(""), 3000);
    } catch (err: any) {
      setToast(err.message);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-slide-up">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t("products.browse")}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        {isSeller && (
          <Link
            href="/browse/add"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200/50 active:scale-95 transition-all text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("products.addProduct")}
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <ErrorState onRetry={() => loadData()} />
      ) : products.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">{t("products.noProducts")}</p>
          <p className="text-xs text-slate-300 mt-1">{t("products.noProductsDesc")}</p>
          {isSeller && (
            <Link
              href="/browse/add"
              className="inline-flex items-center gap-1 mt-4 text-indigo-600 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("products.addProduct")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4 pb-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {products.map((p, i) => {
              const imgSrc = resolveImageUrl(p.image);
              const remaining = p.stock - p.sold;
              const soldOut = remaining <= 0;
              const isLimited = remaining > 0 && remaining <= 3;

              return (
                <Link
                  key={p.id}
                  href={`/browse/${p.id}`}
                  className="block animate-slide-up h-full"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-150 h-full flex flex-col">
                    {/* Image */}
                    {imgSrc ? (
                      <div className="w-full aspect-[4/3] bg-slate-100 relative">
                        <img src={imgSrc} alt={p.name} className="w-full h-full object-cover" />
                        {soldOut && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                            <span className="text-white font-bold text-sm bg-red-500/90 px-4 py-1.5 rounded-xl">{t("products.soldOut")}</span>
                          </div>
                        )}
                        {isLimited && !soldOut && (
                          <div className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {remaining} {t("products.remaining")}
                          </div>
                        )}
                        {!soldOut && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                            <div
                              className={`h-full transition-all ${isLimited ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${(remaining / p.stock) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative">
                        <span className="text-4xl font-bold text-indigo-200">{p.name.charAt(0)}</span>
                        {soldOut && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-sm bg-red-500/90 px-4 py-1.5 rounded-xl">{t("products.soldOut")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{p.seller.firstName} {p.seller.lastName}</p>

                      <div className="mt-auto pt-3">
                        <div className="flex items-end justify-between mb-3">
                          <span className="text-xl font-extrabold text-indigo-600">{formatPrice(p.price, p.currency)}</span>
                          {!soldOut && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${isLimited ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {remaining}/{p.stock}
                            </span>
                          )}
                        </div>

                        {!isSeller && !soldOut && (
                          <button
                            onClick={(e) => handleBuy(e, p.id)}
                            disabled={buyingId === p.id}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {buyingId === p.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                </svg>
                                {t("products.buyNow")}
                              </>
                            )}
                          </button>
                        )}

                        {isSeller && (
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{p._count?.purchases || 0} {t("products.sold")}</span>
                            <span>{formatDate(p.createdAt, t)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {nextCursor && (
            <LoadMore loading={loadingMore} onClick={handleLoadMore} />
          )}
        </>
      )}
    </div>
  );
}
