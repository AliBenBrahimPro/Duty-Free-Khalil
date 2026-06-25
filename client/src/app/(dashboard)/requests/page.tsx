"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRequests } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import RequestCard from "@/components/request-card";
import { timeUntilDeadline } from "@/lib/utils";

export default function RequestsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    getRequests()
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "ALL"
      ? requests
      : requests.filter((r) => r.status === filter);

  const isBuyer = user?.role === "BUYER";
  const pendingCount = requests.filter(
    (r) =>
      (isBuyer && r.status === "PRICED") ||
      (!isBuyer && r.status === "PENDING_PRICE")
  ).length;

  const FILTERS = [
    { key: "ALL", label: t("requests.all") },
    { key: "PENDING_PRICE", label: t("requests.pending") },
    { key: "PRICED", label: t("requests.priced") },
    { key: "CONFIRMED", label: t("requests.done") },
    { key: "UNAVAILABLE", label: t("requests.na") },
    { key: "EXPIRED", label: t("requests.expired") },
  ];

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-slate-400 font-medium">{t("requests.welcomeBack")}</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {user?.firstName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">{timeUntilDeadline(t)}</span>
          </div>
        </div>
        {isBuyer && (
          <Link
            href="/requests/new"
            className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 active:scale-90 transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        )}
      </div>

      {/* Summary card */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl p-4 mb-5 text-white shadow-lg shadow-indigo-200/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">{t("requests.needsAttention")}</p>
              <p className="text-2xl font-extrabold mt-0.5">
                {pendingCount} {pendingCount > 1 ? t("requests.requests") : t("requests.request")}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {FILTERS.map((f) => {
          const count =
            f.key === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                filter === f.key
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white/80 text-slate-500 border border-slate-100 active:bg-slate-50"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full ${
                  filter === f.key ? "bg-white/20" : "bg-slate-100"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">{t("requests.noRequests")}</p>
          {isBuyer && (
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-1 mt-4 text-indigo-600 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("requests.askForPrice")}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-4 md:gap-4 xl:grid-cols-3">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
