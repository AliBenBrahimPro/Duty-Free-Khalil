"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import PinKeypad from "@/components/pin-keypad";

export default function LoginPage() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"username" | "pin">("username");
  const [error, setError] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pin.length === 6 && !loading) {
      handleLogin();
    }
  }, [pin]);

  const handleLogin = async () => {
    setError("");
    setPinError(false);
    setLoading(true);
    try {
      const result = await login(username, pin);
      setAuth(result.user, result.token);
      router.push("/requests");
    } catch (err: any) {
      setError(err.message);
      setPinError(true);
      setPin("");
      setTimeout(() => setPinError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setError("");
      setStep("pin");
    }
  };

  if (step === "pin") {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full lg:bg-white/60 lg:backdrop-blur-xl lg:rounded-3xl lg:border lg:border-white/60 lg:shadow-xl lg:shadow-slate-200/20 lg:my-12 lg:px-10 lg:py-14 lg:max-w-lg animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <span className="text-2xl font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-base font-semibold text-slate-800">@{username}</p>
          <button
            onClick={() => { setStep("username"); setPin(""); setError(""); }}
            className="text-xs text-indigo-500 mt-1 font-medium"
          >
            {t("auth.notYou")}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mb-6">
          {t("auth.enterPin")}
        </p>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl mb-4 text-center border border-rose-100 animate-shake">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center mb-6">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <PinKeypad pin={pin} onPinChange={setPin} error={pinError} />

        <p className="text-center text-sm text-slate-400 mt-10">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/register" className="text-indigo-600 font-semibold">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full lg:bg-white/60 lg:backdrop-blur-xl lg:rounded-3xl lg:border lg:border-white/60 lg:shadow-xl lg:shadow-slate-200/20 lg:my-12 lg:px-10 lg:py-14 lg:max-w-lg animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-200/50 rotate-3">
          <svg className="w-10 h-10 text-white -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V15m0 0-2.25 1.313" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t("auth.signInTitle")}</h1>
        <p className="text-indigo-500 font-semibold text-sm mt-0.5">{t("auth.signInSubtitle")}</p>
      </div>

      <form onSubmit={handleUsernameSubmit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("auth.username")}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-300"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] transition-all duration-200 text-[15px]"
        >
          {t("auth.continue")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-8">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/register" className="text-indigo-600 font-semibold">
          Register
        </Link>
      </p>
    </div>
  );
}
