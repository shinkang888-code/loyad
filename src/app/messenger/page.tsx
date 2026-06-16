"use client";

import { useState } from "react";
import { Send, Smartphone, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { MessengerTemplatePanel } from "@/components/messenger/MessengerTemplatePanel";
import type { MessengerTemplate } from "@/lib/messengerTemplates";
import { cn } from "@/lib/utils";

const MAX_PHONES = 5;

function normalizePhone(v: string): string {
  return v.replace(/\D/g, "").trim();
}

function formatPhoneDisplay(num: string): string {
  const n = num.replace(/\D/g, "");
  if (n.length === 11 && n.startsWith("010")) return n.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (n.length === 10 && n.startsWith("01")) return n.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
  return n || num;
}

export default function MessengerPage() {
  const [phoneBlocks, setPhoneBlocks] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState<"sms" | "kakao" | "telegram">("sms");
  const [sending, setSending] = useState(false);

  const applyTemplate = (t: MessengerTemplate) => {
    setContent(t.content);
    toast.success(`"${t.title}" 양식을 불러왔습니다.`);
  };

  const addPhoneBlock = () => {
    if (channel === "telegram") {
      const id = phoneInput.trim();
      if (!id) {
        toast.error("Telegram Chat ID를 입력하세요.");
        return;
      }
      if (phoneBlocks.includes(id)) {
        toast.error("이미 추가된 수신자입니다.");
        return;
      }
      if (phoneBlocks.length >= MAX_PHONES) {
        toast.error(`수신자는 최대 ${MAX_PHONES}개까지 가능합니다.`);
        return;
      }
      setPhoneBlocks((prev) => [...prev, id]);
      setPhoneInput("");
      return;
    }
    const num = normalizePhone(phoneInput);
    if (num.length < 10) {
      toast.error("올바른 전화번호를 입력하세요.");
      return;
    }
    if (phoneBlocks.includes(num)) {
      toast.error("이미 추가된 번호입니다.");
      return;
    }
    if (phoneBlocks.length >= MAX_PHONES) {
      toast.error(`수신 번호는 최대 ${MAX_PHONES}개까지 가능합니다.`);
      return;
    }
    setPhoneBlocks((prev) => [...prev, num]);
    setPhoneInput("");
  };

  const removePhoneBlock = (num: string) => {
    setPhoneBlocks((prev) => prev.filter((n) => n !== num));
  };

  const receiverList =
    channel === "telegram"
      ? phoneBlocks.filter((p) => p.trim().length > 0)
      : phoneBlocks.filter((p) => p.length >= 10);
  const canSend = receiverList.length > 0 && content.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) {
      if (receiverList.length === 0) toast.error(channel === "telegram" ? "수신자(Chat ID)를 1개 이상 입력하세요." : "수신 번호를 1개 이상 입력하세요.");
      else toast.error("발송 내용을 입력하세요.");
      return;
    }
    if (receiverList.length > MAX_PHONES) {
      toast.error(`수신자는 최대 ${MAX_PHONES}개까지 가능합니다.`);
      return;
    }
    setSending(true);
    try {
      const endpoint =
        channel === "sms"
          ? "/api/messenger/sms"
          : channel === "kakao"
            ? "/api/messenger/kakao"
            : "/api/messenger/telegram";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivers: receiverList,
          message: content.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "발송에 실패했습니다.");
      toast.success(data.message || "발송 요청이 완료되었습니다.");
      setContent("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Send size={22} className="text-primary-600" />
        <h1 className="text-xl font-bold text-slate-900">메신저</h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* 왼쪽: 내용 발송 폼 */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-800">내용 발송</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {channel === "telegram"
                ? "수신자(Telegram Chat ID)를 입력하면 블록으로 추가됩니다. 최대 5개, 내용 입력 후 발송하세요."
                : "수신 번호를 입력하면 블록으로 추가됩니다. 최대 5개, 내용 입력 후 발송하세요."}
            </p>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {channel === "telegram" ? "수신자 (Telegram Chat ID, 최대 5개)" : "수신 번호 (최대 5개)"}
              </label>
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                {phoneBlocks.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 text-primary-800 text-sm font-medium"
                  >
                    {channel === "telegram" ? num : formatPhoneDisplay(num)}
                    <button
                      type="button"
                      onClick={() => removePhoneBlock(num)}
                      className="p-0.5 rounded hover:bg-primary-200/50"
                      aria-label="제거"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {phoneBlocks.length < MAX_PHONES && (
                  <input
                    type={channel === "telegram" ? "text" : "tel"}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addPhoneBlock();
                      }
                    }}
                    placeholder={
                      channel === "telegram"
                        ? (phoneBlocks.length === 0 ? "Chat ID 입력 후 Enter" : "Chat ID 추가")
                        : phoneBlocks.length === 0
                          ? "전화번호 입력 후 Enter"
                          : "번호 추가"
                    }
                    className="flex-1 min-w-[120px] px-2 py-1 text-sm border-0 focus:outline-none focus:ring-0"
                  />
                )}
              </div>
              {phoneBlocks.length < MAX_PHONES && phoneInput.trim() && (
                <Button type="button" variant="ghost" size="sm" className="mt-1.5" onClick={addPhoneBlock}>
                  + 번호 추가
                </Button>
              )}
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-sm font-medium text-slate-700 mb-1.5 shrink-0">
                발송 내용
              </label>
              <div className="flex-1 min-h-[240px]">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="발송할 메시지를 입력하세요. 오른쪽에서 사전 양식을 선택하면 자동 입력됩니다."
                  className="w-full h-full min-h-[240px] px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <span className="text-sm font-medium text-slate-600">발송 유형</span>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-1.5",
                    channel === "sms"
                      ? "bg-primary-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Smartphone size={14} /> 문자 (알리고)
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("kakao")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-1.5",
                    channel === "kakao"
                      ? "bg-primary-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Send size={14} /> 카카오톡
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("telegram")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium flex items-center gap-1.5",
                    channel === "telegram"
                      ? "bg-primary-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <MessageCircle size={14} /> 텔레그램
                </button>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend || sending}
              leftIcon={<Send size={16} />}
              className="w-full sm:w-auto"
            >
              {sending ? "발송 중…" : "발송하기"}
            </Button>
          </div>
        </div>

        <MessengerTemplatePanel onApply={applyTemplate} />
      </div>
    </div>
  );
}
