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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-150 h-full flex flex-col">
        {/* Image — fixed height on mobile, aspect ratio on desktop */}
        <div className={`w-full h-40 md:h-48 bg-slate-100 relative flex-shrink-0 ${!imgSrc ? "bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center" : ""}`}>
          {imgSrc ? (
            <img src={imgSrc} alt={r.productName || "Product"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-indigo-200">
              {r.productName ? r.productName.charAt(0).toUpperCase() : "?"}
            </span>
          )}
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge status={r.status} />
          </div>
          {needsAction && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 flex-1 flex flex-col min-w-0">
          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
            {r.productName || "Product Image"}
          </h3>

          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {isSeller || isAdmin
              ? `${r.buyer.firstName} ${r.buyer.lastName}`
              : r.seller.firstName}
            <span className="mx-1 text-slate-200">|</span>
            {formatDate(r.createdAt, t)}
          </p>

          <div className="mt-auto pt-2.5">
            {r.price ? (
              <div className="flex items-end justify-between gap-1">
                <span className="text-lg font-extrabold text-indigo-600">
                  {formatPrice(r.price, r.currency)}
                </span>
                {needsAction && (
                  <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {t("requests.actionNeeded")}
                  </span>
                )}
              </div>
            ) : needsAction ? (
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-block">
                {isSeller || isAdmin ? t("requests.setPrice") : t("requests.waiting")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
