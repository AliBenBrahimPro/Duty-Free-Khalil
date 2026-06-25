"use client";

import { getStatusColor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const statusKeys: Record<string, string> = {
  PENDING_PRICE: "status.pending",
  PRICED: "status.priced",
  UNAVAILABLE: "status.unavailable",
  ACCEPTED: "status.accepted",
  REJECTED: "status.rejected",
  CONFIRMED: "status.confirmed",
  EXPIRED: "status.expired",
  CANCELLED: "status.cancelled",
};

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const isPending = status === "PENDING_PRICE";
  const key = statusKeys[status] || "status.pending";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide uppercase ${getStatusColor(status)} ${isPending ? "pulse-glow" : ""}`}
    >
      {isPending && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      )}
      {status === "CONFIRMED" && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
      {t(key as any)}
    </span>
  );
}
