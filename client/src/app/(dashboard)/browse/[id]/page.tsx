"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getProduct, buyProduct, getProductPurchases, confirmPurchase, cancelPurchase, updateProduct, deleteProduct, addComment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, resolveImageUrl } from "@/lib/utils";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);

  const isOwner = user?.role === "SELLER" && product?.sellerId === user?.id;
  const isBuyer = user?.role === "BUYER";

  useEffect(() => { loadProduct(); }, [id]);

  const loadProduct = async () => {
    try {
      const p = await getProduct(id);
      setProduct(p);
      if (user?.role === "SELLER" && p.sellerId === user.id) {
        const purch = await getProductPurchases(id);
        setPurchases(purch);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await addComment(id, commentText.trim());
      setCommentText("");
      await loadProduct();
    } catch (err: any) { setError(err.message); }
    finally { setCommentLoading(false); }
  };

  const handleBuy = async () => {
    setActionLoading("buy"); setError("");
    try { await buyProduct(id); await loadProduct(); showToast(t("products.requested")); }
    catch (err: any) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleConfirm = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try { await confirmPurchase(purchaseId); await loadProduct(); }
    catch (err: any) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (purchaseId: string) => {
    setActionLoading(purchaseId);
    try { await cancelPurchase(purchaseId); await loadProduct(); }
    catch (err: any) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const startEdit = () => {
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditDesc(product.description || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setEditLoading(true); setError("");
    try {
      const formData = new FormData();
      if (editName !== product.name) formData.append("name", editName);
      if (parseFloat(editPrice) !== product.price) formData.append("price", editPrice);
      if (parseInt(editStock) !== product.stock) formData.append("stock", editStock);
      if (editDesc !== (product.description || "")) formData.append("description", editDesc);
      await updateProduct(id, formData);
      await loadProduct();
      setEditing(false);
      showToast(t("profile.profileUpdated"));
    } catch (err: any) { setError(err.message); }
    finally { setEditLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    try { await deleteProduct(id); router.push("/browse"); }
    catch (err: any) { setError(err.message); setShowDelete(false); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="px-4 pt-12 text-center animate-fade-in">
      <p className="text-rose-500 font-medium">{error || "Product not found"}</p>
      <button onClick={() => router.back()} className="mt-4 text-indigo-600 text-sm font-semibold">{t("detail.goBack")}</button>
    </div>
  );

  const imgSrc = resolveImageUrl(product.image);
  const remaining = product.stock - product.sold;
  const soldOut = remaining <= 0;
  const isLimited = remaining > 0 && remaining <= 3;

  return (
    <div className="px-4 pt-6 pb-8 animate-fade-in md:px-6 lg:px-8 lg:max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-slide-up">
          {toast}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">{t("products.delete")}</h3>
            <p className="text-sm text-slate-500 text-center mb-5">{t("products.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl">{t("detail.cancel")}</button>
              <button onClick={handleDelete} disabled={actionLoading === "delete"}
                className="flex-1 py-3 bg-rose-500 text-white font-semibold rounded-xl disabled:opacity-50">
                {actionLoading === "delete" ? "..." : t("products.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm active:scale-95 transition">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">{product.name}</h1>
        {isOwner && !editing && (
          <div className="flex gap-2">
            <button onClick={startEdit} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center active:scale-95 transition">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
              </svg>
            </button>
            <button onClick={() => setShowDelete(true)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center active:scale-95 transition">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl mb-4 border border-rose-100 animate-shake">{error}</div>}

      {/* Product Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/60 overflow-hidden shadow-sm mb-4">
        {imgSrc && (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] bg-slate-100 relative">
            <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
            {soldOut && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-white font-bold text-lg bg-red-500/90 px-5 py-2 rounded-xl">{t("products.soldOut")}</span>
              </div>
            )}
            {isLimited && !soldOut && (
              <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {t("products.limited")} — {remaining} {t("products.remaining")}
              </div>
            )}
            {/* Stock progress bar */}
            {!soldOut && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/10">
                <div className={`h-full transition-all ${isLimited ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${(remaining / product.stock) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          {editing ? (
            <div className="space-y-3">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base font-semibold" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("products.price")} (DT)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">{t("products.stock")}</label>
                  <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} placeholder={t("products.descPlaceholder")} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm" />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={editLoading} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl disabled:opacity-50 text-sm">
                  {editLoading ? t("products.saving") : t("products.save")}
                </button>
                <button onClick={() => setEditing(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm">{t("detail.cancel")}</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
              {product.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{product.description}</p>}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("products.price")}</p>
                  <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{formatPrice(product.price, product.currency)}</p>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div className="flex-1 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">{t("products.stock")}</p>
                  <p className={`text-2xl font-extrabold mt-0.5 ${soldOut ? "text-red-500" : isLimited ? "text-amber-500" : "text-emerald-600"}`}>
                    {remaining}<span className="text-sm font-medium text-slate-400 ml-1">/ {product.stock}</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{t("detail.from")}: {product.seller.firstName} {product.seller.lastName}</p>
            </>
          )}
        </div>
      </div>

      {/* Buy Button */}
      {isBuyer && !soldOut && (
        <button onClick={handleBuy} disabled={actionLoading === "buy"}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-200/30 text-[15px] flex items-center justify-center gap-2 mb-4">
          {actionLoading === "buy" ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
            {t("products.buyNow")} — {formatPrice(product.price, product.currency)}</>
          )}
        </button>
      )}

      {isBuyer && soldOut && <div className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl text-center text-[15px] mb-4">{t("products.soldOut")}</div>}

      {/* Seller: Purchase Requests */}
      {isOwner && (
        <div className="mt-2">
          <h3 className="text-lg font-bold text-slate-900 mb-3">{t("products.purchases")} ({purchases.length})</h3>
          {purchases.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">{t("products.noPurchases")}</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((p: any) => (
                <div key={p.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">{p.buyer?.firstName?.charAt(0) || "?"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.buyer?.firstName} {p.buyer?.lastName}</p>
                        <p className="text-[10px] text-slate-400">@{p.buyer?.username} - {formatDate(p.createdAt, t)}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      p.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : p.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-slate-50 text-slate-400 border border-slate-200"
                    }`}>{p.status}</span>
                  </div>
                  {p.status === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleConfirm(p.id)} disabled={actionLoading === p.id}
                        className="flex-1 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition disabled:opacity-50">
                        {actionLoading === p.id ? "..." : t("products.confirm")}
                      </button>
                      <button onClick={() => handleCancel(p.id)} disabled={actionLoading === p.id}
                        className="flex-1 py-2.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl active:scale-[0.98] transition border border-rose-100 disabled:opacity-50">
                        {t("products.cancel")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          {t("products.comments")} ({product.comments?.length || 0})
        </h3>

        {/* Comment input */}
        <div className="flex gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-indigo-600">
              {user?.firstName?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              placeholder={t("products.addComment")}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-300"
            />
            <button
              onClick={handleAddComment}
              disabled={commentLoading || !commentText.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl active:scale-95 transition disabled:opacity-50 flex-shrink-0"
            >
              {commentLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Comments list */}
        {(!product.comments || product.comments.length === 0) ? (
          <p className="text-center text-slate-300 text-sm py-6">{t("products.noComments")}</p>
        ) : (
          <div className="space-y-3">
            {product.comments.map((c: any) => {
              const isMine = c.userId === user?.id;
              const roleColor = c.userRole === "SELLER"
                ? "bg-violet-50 text-violet-600 border-violet-200"
                : c.userRole === "SUPERADMIN"
                  ? "bg-red-50 text-red-500 border-red-200"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200";
              return (
                <div key={c.id} className={`rounded-2xl p-3.5 ${isMine ? "bg-indigo-50/50 border border-indigo-100" : "bg-white/80 border border-white/60"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${roleColor}`}>
                      {c.userName?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{c.userName}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleColor}`}>
                      {c.userRole}
                    </span>
                    <span className="text-[10px] text-slate-300 ml-auto">{formatDate(c.createdAt, t)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed pl-9">{c.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
