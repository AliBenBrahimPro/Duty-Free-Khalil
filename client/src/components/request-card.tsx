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
  const isAdmin = user?.role === "SUPERADMIN";
  const imgSrc = resolveImageUrl(r.productImage);
  const needsAction =
    ((isSeller || isAdmin) && r.status === "PENDING_PRICE") ||
    ((!isSeller || isAdmin) && r.status === "PRICED");

  return (
    <Link href={`/requests/${r.id}`} className="block animate-slide-up h-full">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-150 h-full flex flex-col">
        {/* Image */}
        {imgSrc ? (
          <div className="w-full aspect-[4/3] bg-slate-100 relative">
            <img src={imgSrc} alt={r.productName || "Product"} className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3">
              <StatusBadge status={r.status} />
            </div>
            {needsAction && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 animate-pulse" />
            )}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative">
            <span className="text-4xl font-bold text-indigo-200">
              {r.productName ? r.productName.charAt(0).toUpperCase() : "?"}
            </span>
            <div className="absolute top-3 right-3">
              <StatusBadge status={r.status} />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
            {r.productName || "Product Image"}
          </h3>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-400">
              {isSeller || isAdmin
                ? `${r.buyer.firstName} ${r.buyer.lastName}`
                : r.seller.firstName}
            </span>
            <span className="text-slate-200">|</span>
            <span className="text-xs text-slate-300">{formatDate(r.createdAt, t)}</span>
          </div>

          <div className="mt-auto pt-3">
            {r.price ? (
              <div className="flex items-end justify-between">
                <span className="text-xl font-extrabold text-indigo-600">
                  {formatPrice(r.price, r.currency)}
                </span>
                {needsAction && (
                  <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {t("requests.actionNeeded")}
                  </span>
                )}
              </div>
            ) : needsAction ? (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-block">
                {isSeller || isAdmin ? t("requests.setPrice") : t("requests.waiting")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
