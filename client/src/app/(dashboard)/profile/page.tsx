"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { timeUntilDeadline, resolveImageUrl } from "@/lib/utils";
import { updateProfile, changePin } from "@/lib/api";
import PinKeypad from "@/components/pin-keypad";

export default function ProfilePage() {
  const { user, logout, setAuth } = useAuth();
  const { t, locale, setLocale } = useI18n();

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // Change PIN state
  const [changingPin, setChangingPin] = useState(false);
  const [pinStep, setPinStep] = useState<"current" | "new" | "confirm">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState("");

  if (!user) return null;

  const avatarSrc = resolveImageUrl(user.profileImage);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const startEditing = () => {
    setEditFirst(user.firstName);
    setEditLast(user.lastName);
    setEditImage(null);
    setEditImagePreview(null);
    setEditMsg("");
    setEditing(true);
  };

  const handleEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onload = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setEditLoading(true);
    setEditMsg("");
    try {
      const formData = new FormData();
      if (editFirst !== user.firstName) formData.append("firstName", editFirst);
      if (editLast !== user.lastName) formData.append("lastName", editLast);
      if (editImage) formData.append("profileImage", editImage);

      const updated = await updateProfile(formData);
      setAuth({ ...user, ...updated }, token!);
      setEditing(false);
      setEditMsg(t("profile.profileUpdated"));
      setTimeout(() => setEditMsg(""), 3000);
    } catch (err: any) {
      setEditMsg(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // PIN flow handlers
  const handleCurrentPinComplete = () => {
    if (currentPin.length === 6) setPinStep("new");
  };
  const handleNewPinComplete = () => {
    if (newPin.length === 6) setPinStep("confirm");
  };
  const handleConfirmPinComplete = async () => {
    if (confirmNewPin.length === 6) {
      if (confirmNewPin !== newPin) {
        setPinError(t("auth.pinMismatch"));
        setPinShake(true);
        setTimeout(() => {
          setConfirmNewPin("");
          setNewPin("");
          setPinStep("new");
          setPinShake(false);
        }, 600);
        return;
      }
      setPinLoading(true);
      setPinError("");
      try {
        await changePin(currentPin, newPin);
        setPinMsg(t("profile.pinChanged"));
        setChangingPin(false);
        resetPinState();
        setTimeout(() => setPinMsg(""), 3000);
      } catch (err: any) {
        setPinError(err.message);
        setPinShake(true);
        setTimeout(() => {
          resetPinState();
          setPinShake(false);
        }, 600);
      } finally {
        setPinLoading(false);
      }
    }
  };

  const resetPinState = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmNewPin("");
    setPinStep("current");
  };

  // PIN step auto-advance
  if (currentPin.length === 6 && pinStep === "current") handleCurrentPinComplete();
  if (newPin.length === 6 && pinStep === "new") handleNewPinComplete();
  if (confirmNewPin.length === 6 && pinStep === "confirm" && !pinLoading) handleConfirmPinComplete();

  // Change PIN view
  if (changingPin) {
    const pinStepLabel = {
      current: t("profile.currentPin"),
      new: t("profile.newPin"),
      confirm: t("profile.confirmNewPin"),
    };
    const activePinValue = pinStep === "current" ? currentPin : pinStep === "new" ? newPin : confirmNewPin;
    const activePinSetter = pinStep === "current" ? setCurrentPin : pinStep === "new" ? setNewPin : setConfirmNewPin;

    return (
      <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`w-8 h-1 rounded-full ${pinStep === "current" ? "bg-indigo-500" : "bg-slate-200"}`} />
          <div className={`w-8 h-1 rounded-full ${pinStep === "new" ? "bg-indigo-500" : "bg-slate-200"}`} />
          <div className={`w-8 h-1 rounded-full ${pinStep === "confirm" ? "bg-indigo-500" : "bg-slate-200"}`} />
        </div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{pinStepLabel[pinStep]}</h1>
        </div>

        {pinError && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl mb-4 text-center border border-rose-100 animate-shake">
            {pinError}
          </div>
        )}

        {pinLoading && (
          <div className="flex justify-center mb-6">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <PinKeypad pin={activePinValue} onPinChange={activePinSetter} error={pinShake} />

        <button
          onClick={() => { setChangingPin(false); resetPinState(); setPinError(""); }}
          className="text-sm text-slate-400 mt-8 text-center font-medium w-full"
        >
          {t("detail.cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t("profile.title")}</h1>

      {/* Success messages */}
      {(editMsg || pinMsg) && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-4 border border-emerald-100 animate-fade-in">
          {editMsg || pinMsg}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 overflow-hidden shadow-sm mb-4">
        <div className="h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 relative">
          <div className="absolute -bottom-10 left-6">
            {editing ? (
              <label className="cursor-pointer">
                <div className="relative">
                  {editImagePreview || avatarSrc ? (
                    <img
                      src={editImagePreview || avatarSrc!}
                      alt={user.firstName}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-3xl font-bold text-white">{user.firstName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center border-4 border-transparent">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                    </svg>
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={handleEditImage} className="hidden" />
              </label>
            ) : avatarSrc ? (
              <img src={avatarSrc} alt={user.firstName} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-3xl font-bold text-white">{user.firstName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editFirst}
                  onChange={(e) => setEditFirst(e.target.value)}
                  placeholder={t("auth.firstName")}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                <input
                  type="text"
                  value={editLast}
                  onChange={(e) => setEditLast(e.target.value)}
                  placeholder={t("auth.lastName")}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={editLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                >
                  {editLoading ? t("profile.saving") : t("profile.save")}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm"
                >
                  {t("detail.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.firstName} {user.lastName}</h2>
                <p className="text-sm text-slate-400 font-medium">@{user.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  user.role === "SELLER" ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                }`}>
                  {user.role}
                </span>
                <button
                  onClick={startEditing}
                  className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-3 mb-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <span className="text-sm text-slate-500">{t("profile.username")}</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">@{user.username}</span>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="text-sm text-slate-500">{t("profile.timeRemaining")}</span>
          </div>
          <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">{timeUntilDeadline(t)}</span>
        </div>

        {/* Change PIN button */}
        <button
          onClick={() => { setChangingPin(true); resetPinState(); setPinError(""); setPinMsg(""); }}
          className="w-full bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 flex items-center justify-between shadow-sm text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <span className="text-sm text-slate-500">{t("profile.changePin")}</span>
          </div>
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Language Switcher */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
            </svg>
          </div>
          <span className="text-sm text-slate-500">Language / Langue</span>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setLocale("fr")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              locale === "fr" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
            }`}
          >
            Francais
          </button>
          <button
            onClick={() => setLocale("en")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              locale === "en" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
            }`}
          >
            English
          </button>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl active:scale-[0.98] transition-all border border-rose-100 text-[15px]"
      >
        {t("profile.signOut")}
      </button>
    </div>
  );
}
