"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSellers, createRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type ImageMode = "upload" | "url";

export default function NewRequestPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSellers().then((s) => {
      setSellers(s);
      if (s.length === 1) setSellerId(s[0].id);
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImageUrl("");
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setImageUrl("");
  };

  const hasImage = !!image || !!imageUrl;
  const previewSrc = imagePreview || imageUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      setError("Please select a seller");
      return;
    }
    if (!productName && !hasImage) {
      setError("Provide a product name or image");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sellerId", sellerId);
      if (productName) formData.append("productName", productName);
      if (description) formData.append("description", description);
      if (image) {
        formData.append("productImage", image);
      } else if (imageUrl) {
        formData.append("productImageUrl", imageUrl);
      }

      await createRequest(formData);
      router.push("/requests");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm active:scale-95 transition"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">{t("newRequest.title")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl border border-rose-100 animate-shake">
            {error}
          </div>
        )}

        {/* Seller Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("newRequest.askWho")}
          </label>
          {sellers.length <= 3 ? (
            <div className="grid gap-2">
              {sellers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSellerId(s.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    sellerId === s.id
                      ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                      : "border-slate-100 bg-white/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    sellerId === s.id
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {s.firstName.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-slate-800">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-slate-400">@{s.username}</p>
                  </div>
                  {sellerId === s.id && (
                    <svg className="w-5 h-5 text-indigo-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            >
              <option value="">Select a seller</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} (@{s.username})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Product Image */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("newRequest.productPhoto")}
          </label>

          {/* Mode toggle */}
          {!previewSrc && (
            <div className="flex bg-slate-100 rounded-xl p-1 mb-3">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  imageMode === "upload"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                {t("newRequest.upload")}
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  imageMode === "url"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                {t("newRequest.pasteUrl")}
              </button>
            </div>
          )}

          {/* Preview */}
          {previewSrc ? (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
              <img
                src={previewSrc}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).alt = "Failed to load image";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-xl flex items-center justify-center active:scale-90 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {imageUrl && (
                <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  URL
                </div>
              )}
            </div>
          ) : imageMode === "upload" ? (
            <label className="block cursor-pointer">
              <div className="w-full h-36 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {t("newRequest.tapToUpload")}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImage(null);
                  setImagePreview(null);
                }}
                placeholder="https://example.com/perfume.jpg"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-300 text-sm"
              />
            </div>
          )}
        </div>

        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("newRequest.productName")}
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Dior Sauvage 100ml"
            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-300"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            {t("newRequest.note")} <span className="text-slate-300 font-normal">{t("newRequest.optional")}</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any specific details..."
            rows={2}
            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm placeholder:text-slate-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-indigo-200/30 text-[15px] flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              {t("newRequest.send")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
