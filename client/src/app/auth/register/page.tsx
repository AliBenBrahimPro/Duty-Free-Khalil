"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import PinKeypad from "@/components/pin-keypad";

export default function RegisterPage() {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "pin" | "confirm">("info");
  const [error, setError] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pin.length === 6 && step === "pin") {
      setStep("confirm");
    }
  }, [pin, step]);

  useEffect(() => {
    if (confirmPin.length === 6 && step === "confirm") {
      if (confirmPin !== pin) {
        setError("PINs don't match. Try again.");
        setPinError(true);
        setTimeout(() => {
          setConfirmPin("");
          setPin("");
          setStep("pin");
          setPinError(false);
        }, 600);
      } else {
        handleSubmit();
      }
    }
  }, [confirmPin, step]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("pin");
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("username", username);
      formData.append("pin", pin);
      if (image) formData.append("profileImage", image);

      const result = await register(formData);
      setAuth(result.user, result.token);
      router.push("/requests");
    } catch (err: any) {
      setError(err.message);
      setPin("");
      setConfirmPin("");
      setStep("pin");
    } finally {
      setLoading(false);
    }
  };

  // PIN step
  if (step === "pin" || step === "confirm") {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full lg:bg-white/60 lg:backdrop-blur-xl lg:rounded-3xl lg:border lg:border-white/60 lg:shadow-xl lg:shadow-slate-200/20 lg:my-12 lg:px-10 lg:py-14 lg:max-w-lg animate-fade-in">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-8 h-1 rounded-full bg-indigo-500" />
          <div className={`w-8 h-1 rounded-full ${step === "confirm" ? "bg-indigo-500" : "bg-slate-200"}`} />
        </div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {step === "pin" ? t("auth.createPin") : t("auth.confirmPin")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === "pin"
              ? t("auth.choosePinDesc")
              : t("auth.confirmPinDesc")}
          </p>
        </div>

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

        <PinKeypad
          pin={step === "pin" ? pin : confirmPin}
          onPinChange={step === "pin" ? setPin : setConfirmPin}
          error={pinError}
        />

        <button
          onClick={() => {
            setPin("");
            setConfirmPin("");
            setError("");
            setStep("info");
          }}
          className="text-sm text-slate-400 mt-8 text-center font-medium"
        >
          {t("auth.backToInfo")}
        </button>
      </div>
    );
  }

  // Info step
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full lg:bg-white/60 lg:backdrop-blur-xl lg:rounded-3xl lg:border lg:border-white/60 lg:shadow-xl lg:shadow-slate-200/20 lg:my-12 lg:px-10 lg:py-14 lg:max-w-lg animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t("auth.createAccount")}</h1>
        <p className="text-slate-400 mt-1">{t("auth.createAccountDesc")}</p>
      </div>

      <form onSubmit={handleInfoSubmit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}

        {/* Profile Image */}
        <div className="flex justify-center mb-2">
          <label className="cursor-pointer group">
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-indigo-100 shadow-lg">
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/80 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group-hover:border-indigo-300 group-hover:bg-indigo-50/50 transition-all shadow-sm">
                <svg className="w-7 h-7 text-slate-300 group-hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">{t("auth.addPhoto")}</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              {t("auth.firstName")}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ahmed"
              required
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              {t("auth.lastName")}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ben Ali"
              required
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("auth.username")}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-medium">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="username"
              required
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full pl-9 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-300"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] transition-all duration-200 text-[15px]"
        >
          {t("auth.continue")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-8">
        {t("auth.hasAccount")}{" "}
        <Link href="/auth/login" className="text-indigo-600 font-semibold">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
