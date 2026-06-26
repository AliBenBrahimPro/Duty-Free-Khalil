"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { addRequestComment, getChatToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { formatDate, resolveImageUrl } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  type?: string;
  image?: string | null;
  audio?: string | null;
  userId: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

interface RequestChatProps {
  requestId: string;
  buyerId: string;
  sellerId: string;
  initialMessages: Message[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function RequestChat({ requestId, initialMessages }: RequestChatProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTypingSentRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelayRef = useRef(1000);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => { setMessages(initialMessages || []); }, [initialMessages]);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // SSE with token exchange + auto-reconnect
  const connectSSE = useCallback(async () => {
    if (!requestId) return;

    try {
      const { token: sseToken } = await getChatToken(requestId);
      const es = new EventSource(`${API_URL}/requests/${requestId}/chat/stream?token=${sseToken}`);
      esRef.current = es;

      es.addEventListener("connected", () => {
        setConnected(true);
        reconnectDelayRef.current = 1000; // reset backoff on success
      });

      es.addEventListener("new_message", (e) => {
        try {
          const msg: Message = JSON.parse(e.data);
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        } catch { /* */ }
      });

      es.addEventListener("typing", (e) => {
        try {
          const data = JSON.parse(e.data);
          setTypingUser(data.userName);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        } catch { /* */ }
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        // Exponential backoff reconnect: 1s -> 2s -> 4s -> ... -> max 30s
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, 30_000);
        reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
      };
    } catch {
      // Token fetch failed, retry with backoff
      setConnected(false);
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30_000);
      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    }
  }, [requestId]);

  useEffect(() => {
    connectSSE();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectSSE]);

  const sendTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_URL}/requests/${requestId}/chat/typing`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).catch(() => {});
  }, [requestId]);

  // Send text/image message
  const handleSend = async () => {
    const trimmed = text.trim();
    const hasImage = !!imageFile;
    if (!trimmed && !hasImage) return;
    if (sending) return;

    setSending(true);
    const msgType = hasImage ? "image" : "text";
    const displayText = trimmed || (hasImage ? "📷" : "");

    const optimistic: Message = {
      id: `temp-${Date.now()}`, text: displayText, type: msgType,
      image: imagePreview, audio: null,
      userId: user!.id, userName: `${user!.firstName} ${user!.lastName}`,
      userRole: user!.role, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setImageFile(null);
    setImagePreview(null);

    try {
      const saved = await addRequestComment(requestId, trimmed, hasImage ? imageFile! : undefined, msgType);
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Image pick
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        if (blob.size < 1000) return; // too short
        await sendVoice(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      // mic not available
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(recordTimerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(recordTimerRef.current);
  };

  const sendVoice = async (blob: Blob) => {
    setSending(true);
    const optimistic: Message = {
      id: `temp-${Date.now()}`, text: "🎤", type: "voice",
      image: null, audio: URL.createObjectURL(blob),
      userId: user!.id, userName: `${user!.firstName} ${user!.lastName}`,
      userRole: user!.role, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await addRequestComment(requestId, "", blob, "voice");
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.trim()) sendTyping();
  };

  const formatRecordTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const groupedMessages = groupByDate(messages, t);

  const roleColor = (role: string) =>
    role === "SELLER" ? "bg-violet-500" : role === "SUPERADMIN" ? "bg-red-500" : "bg-indigo-500";
  const roleBadgeColor = (role: string) =>
    role === "SELLER" ? "bg-violet-50 text-violet-600 border-violet-200"
      : role === "SUPERADMIN" ? "bg-red-50 text-red-500 border-red-200"
        : "bg-indigo-50 text-indigo-600 border-indigo-200";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <h3 className="text-lg font-bold text-slate-900">{t("chat.title")} ({messages.length})</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-300"}`} />
          <span className="text-[10px] text-slate-400 font-medium">{connected ? t("chat.live") : t("chat.connecting")}</span>
        </div>
      </div>

      <div ref={chatContainerRef} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden shadow-sm">
        <div className="max-h-[400px] lg:max-h-[550px] overflow-y-auto p-4 space-y-1 scroll-smooth" style={{ overscrollBehavior: "contain" }}>
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">{t("chat.empty")}</p>
              <p className="text-xs text-slate-300 mt-1">{t("chat.emptyDesc")}</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">{group.label}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                {group.messages.map((msg, i) => {
                  const isMine = msg.userId === user?.id;
                  const showAvatar = i === 0 || group.messages[i - 1].userId !== msg.userId;
                  const isLast = i === group.messages.length - 1 || group.messages[i + 1]?.userId !== msg.userId;
                  const imgUrl = msg.image ? (msg.id.startsWith("temp-") ? msg.image : resolveImageUrl(msg.image)) : null;
                  const audioUrl = msg.audio ? (msg.id.startsWith("temp-") ? msg.audio : resolveImageUrl(msg.audio)) : null;

                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${showAvatar ? "mt-3" : "mt-0.5"} animate-chat-msg`}>
                      {!isMine && (
                        <div className="w-7 flex-shrink-0 mr-2">
                          {showAvatar ? (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${roleColor(msg.userRole)}`}>
                              {msg.userName?.charAt(0) || "?"}
                            </div>
                          ) : <div className="w-7" />}
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        {showAvatar && !isMine && (
                          <div className="flex items-center gap-1.5 mb-1 ml-1">
                            <span className="text-xs font-semibold text-slate-700">{msg.userName}</span>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleBadgeColor(msg.userRole)}`}>{msg.userRole}</span>
                          </div>
                        )}

                        {/* Image message */}
                        {(msg.type === "image" && imgUrl) ? (
                          <div className={`rounded-2xl overflow-hidden border ${isMine ? "border-indigo-200" : "border-slate-100"} ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}>
                            <img src={imgUrl} alt="" className="max-w-full max-h-60 object-cover cursor-pointer" onClick={() => window.open(imgUrl!, "_blank")} />
                            {msg.text && msg.text !== "📷" && (
                              <div className={`px-3.5 py-2 text-sm ${isMine ? "bg-indigo-600 text-white" : "bg-white text-slate-700"}`}>{msg.text}</div>
                            )}
                          </div>
                        ) : (msg.type === "voice" && audioUrl) ? (
                          /* Voice message */
                          <div className={`px-3 py-2 rounded-2xl flex items-center gap-2.5 min-w-[180px] ${
                            isMine ? "bg-indigo-600" : "bg-white border border-slate-100"
                          } ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-white/20" : "bg-indigo-50"}`}>
                              <svg className={`w-4 h-4 ${isMine ? "text-white" : "text-indigo-600"}`} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2Z" />
                              </svg>
                            </div>
                            <audio controls preload="metadata" className={`h-8 flex-1 min-w-0 ${isMine ? "[&::-webkit-media-controls-panel]:bg-indigo-500" : ""}`}
                              style={{ maxWidth: "100%" }}>
                              <source src={audioUrl} />
                            </audio>
                          </div>
                        ) : (
                          /* Text message */
                          <div className={`px-3.5 py-2 text-sm leading-relaxed break-words ${
                            isMine
                              ? `bg-indigo-600 text-white ${showAvatar ? "rounded-2xl rounded-tr-md" : "rounded-xl rounded-tr-md"}`
                              : `bg-white text-slate-700 border border-slate-100 ${showAvatar ? "rounded-2xl rounded-tl-md" : "rounded-xl rounded-tl-md"}`
                          } ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}>
                            {msg.text}
                          </div>
                        )}

                        {isLast && (
                          <span className={`text-[10px] text-slate-300 mt-1 ${isMine ? "mr-1 text-right" : "ml-1"}`}>
                            {formatDate(msg.createdAt, t)}
                            {isMine && msg.id.startsWith("temp-") && <span className="ml-1 text-indigo-300">{t("chat.sending")}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {typingUser && (
            <div className="flex items-center gap-2 mt-2 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-slate-500">{typingUser.charAt(0)}</span>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-4 py-2.5 flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-3 pt-3 bg-white/80 border-t border-slate-100">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-xl object-cover border border-slate-200" />
              <button onClick={clearImage} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs active:scale-90">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-slate-100 p-3 bg-white/80">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />

          {recording ? (
            /* Recording UI */
            <div className="flex items-center gap-3">
              <button onClick={cancelRecording} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition flex-shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-rose-600">{t("chat.recording")}</span>
                <span className="text-sm font-mono text-slate-400">{formatRecordTime(recordTime)}</span>
              </div>
              <button onClick={stopRecording} className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center active:scale-90 transition shadow-lg shadow-indigo-200/50 flex-shrink-0">
                <svg className="w-5 h-5 text-white -rotate-45 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          ) : (
            /* Normal input UI */
            <div className="flex items-center gap-2">
              {/* Image button */}
              <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </button>

              {/* Text input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef} type="text" value={text}
                  onChange={handleInputChange} onKeyDown={handleKeyDown}
                  placeholder={t("chat.placeholder")}
                  className="w-full px-4 py-2.5 pr-12 rounded-full border border-slate-200 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm placeholder:text-slate-300"
                />
                {(text.trim() || imageFile) ? (
                  <button onClick={handleSend} disabled={sending}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-30">
                    {sending ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 -rotate-45 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>

              {/* Mic button — only when no text */}
              {!text.trim() && !imageFile && (
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={() => recording && cancelRecording()}
                  onTouchStart={startRecording} onTouchEnd={stopRecording}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 active:text-indigo-700 transition flex-shrink-0"
                  title={t("chat.holdToRecord")}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2Z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(messages: Message[], t: (key: any) => string) {
  const groups: { date: string; label: string; messages: Message[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const dateKey = d.toDateString();
    let label: string;
    if (dateKey === today.toDateString()) label = t("chat.today");
    else if (dateKey === yesterday.toDateString()) label = t("chat.yesterday");
    else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const existing = groups.find((g) => g.date === dateKey);
    if (existing) existing.messages.push(msg);
    else groups.push({ date: dateKey, label, messages: [msg] });
  }
  return groups;
}
