"use client";

import { useI18n } from "@/lib/i18n";

interface LoadMoreProps {
  loading: boolean;
  onClick: () => void;
}

export default function LoadMore({ loading, onClick }: LoadMoreProps) {
  const { t } = useI18n();

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          t("general.loadMore")
        )}
      </button>
    </div>
  );
}
