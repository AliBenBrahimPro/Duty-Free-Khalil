"use client";

import Link from "next/link";
import StatusBadge from "./status-badge";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

interface RequestCardProps {
  request: {
    id: string;
    productName?: string | null;
    productImage?: string | null;
    description?: string | null;
    price?: number | null;
    currency: string;
    status: string;
    createdAt: string;
    buyer: { firstName: string; lastName: string };
    seller: { firstName: string; lastName: string };
  };
}

export default function RequestCard({ request: r }: RequestCardProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isSeller = user?.role === "SELLER";
  const imgSrc = resolveImageUrl(r.productImage);
  const needsAction =
    (isSeller && r.status === "PENDING_PRICE") ||
    (!isSeller && r.status === "PRICED");

  return (
    <Link href={`/requests/${r.id}`} className="block animate-slide-up h-full">
      <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all duration-150 h-full ${needsAction ? "border-l-4 border-l-indigo-500 border-y border-r border-white/60" : "border border-white/60"}`}>
        <div className="flex items-start gap-3">
          {imgSrc ? (
            <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm">
              <img
                src={imgSrc}
                alt={r.productName || "Product"}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">
                {r.productName ? r.productName.charAt(0).toUpperCase() : "?"}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate text-[15px] leading-tight">
                  {r.productName || "Product Image"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isSeller
                    ? `${r.buyer.firstName} ${r.buyer.lastName}`
                    : r.seller.firstName}
                  <span className="mx-1 text-slate-200">|</span>
                  {formatDate(r.createdAt, t)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {r.price && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-base font-bold text-indigo-600">
                  {formatPrice(r.price, r.currency)}
                </span>
                {needsAction && (
                  <span className="text-[10px] font-medium text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {t("requests.actionNeeded")}
                  </span>
                )}
              </div>
            )}

            {!r.price && needsAction && (
              <div className="mt-2">
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {isSeller ? t("requests.setPrice") : t("requests.waiting")}
                </span>
              </div>
            )}
          </div>

          <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
