export function formatPrice(price: number, currency = "DT") {
  return `${price.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

type T = (key: any) => string;

export function formatDate(date: string, t?: T) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (t) {
    if (diffMin < 1) return t("time.justNow");
    if (diffMin < 60) return `${diffMin} ${t("time.mAgo")}`;
    if (diffHr < 24) return `${diffHr} ${t("time.hAgo")}`;
    if (diffDay < 7) return `${diffDay} ${t("time.dAgo")}`;
  } else {
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING_PRICE: "bg-amber-50 text-amber-700 border border-amber-200",
    PRICED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    UNAVAILABLE: "bg-slate-50 text-slate-500 border border-slate-200",
    ACCEPTED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-600 border border-rose-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    EXPIRED: "bg-orange-50 text-orange-600 border border-orange-200",
    CANCELLED: "bg-slate-50 text-slate-400 border border-slate-200",
  };
  return colors[status] || "bg-slate-50 text-slate-500 border border-slate-200";
}

export function getStatusIcon(status: string) {
  const icons: Record<string, string> = {
    PENDING_PRICE: "clock",
    PRICED: "tag",
    UNAVAILABLE: "x-circle",
    CONFIRMED: "check-circle",
    REJECTED: "x-circle",
    EXPIRED: "alert",
    CANCELLED: "x-circle",
  };
  return icons[status] || "circle";
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PRICE: "Pending",
    PRICED: "Priced",
    UNAVAILABLE: "Unavailable",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    CONFIRMED: "Confirmed",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
  };
  return labels[status] || status;
}

export function timeUntilDeadline(t?: T, deadline?: string) {
  const deadlineDate = new Date(deadline || "2026-07-08T23:59:59.000Z");
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  if (diff <= 0) return t ? t("time.expired") : "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (t) {
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `${months} ${t("time.monthsLeft")}`;
    }
    if (days > 0) return `${days} ${t("time.dLeft")} ${hours} ${t("time.hLeft")}`;
    return `${hours} ${t("time.hLeft")}`;
  }

  if (days > 30) return `${Math.floor(days / 30)} months left`;
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase =
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")
      : "") || "http://localhost:5000";
  return `${apiBase}${path}`;
}
