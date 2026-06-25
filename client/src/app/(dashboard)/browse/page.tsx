"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProducts, getMyProducts, buyProduct } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, resolveImageUrl } from "@/lib/utils";

export default function BrowsePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const isSeller = user?.role === "SELLER";

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (productId: string) => {
    setBuyingId(productId);
    try {
      await buyProduct(productId);
      // Refresh products
      const updated = await getProducts();
      setProducts(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8">
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
            className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 active:scale-90 transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">{t("products.noProducts")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const imgSrc = resolveImageUrl(p.image);
            const remaining = p.stock - p.sold;
            const soldOut = remaining <= 0;
            const isLimited = remaining > 0 && remaining <= 3;

            return (
              <div
                key={p.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden shadow-sm animate-slide-up h-full flex flex-col"
              >
                {/* Image */}
                <Link href={`/browse/${p.id}`} className="block">
                  {imgSrc ? (
                    <div className="w-full aspect-square bg-slate-100 relative">
                      <img src={imgSrc} alt={p.name} className="w-full h-full object-cover" />
                      {soldOut && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-lg">{t("products.soldOut")}</span>
                        </div>
                      )}
                      {isLimited && !soldOut && (
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          {t("products.limited")} — {remaining} {t("products.remaining")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative">
                      <span className="text-3xl font-bold text-indigo-200">{p.name.charAt(0)}</span>
                      {soldOut && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-lg">{t("products.soldOut")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col">
                  <Link href={`/browse/${p.id}`}>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{p.name}</h3>
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">{p.seller.firstName}</p>

                  <div className="mt-auto pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-extrabold text-indigo-600">{formatPrice(p.price, p.currency)}</span>
                      {!soldOut && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isLimited ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {remaining} {t("products.inStock")}
                        </span>
                      )}
                    </div>

                    {!isSeller && !soldOut && (
                      <button
                        onClick={() => handleBuy(p.id)}
                        disabled={buyingId === p.id}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {buyingId === p.id ? "..." : t("products.buyNow")}
                      </button>
                    )}
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
