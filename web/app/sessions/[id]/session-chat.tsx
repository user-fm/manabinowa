"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage } from "./actions";

// E-10 セッション内チャット。
// 送信は Server Action(認可はサーバー側)、受信は Supabase Realtime。
// 購読にも chat_messages の RLS が効くため、参加者以外には配信されない。

export type ChatMessage = {
  id: number;
  sender_id: string | null;
  body: string;
  created_at: string;
};

type SessionChatProps = {
  sessionId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  /** 送信者ID → 表示名。Realtime のペイロードには名前が乗らないため事前に渡す。 */
  senderNames: Record<string, string>;
  canPost: boolean;
};

type ConnectionState = "connecting" | "connected" | "error";

export function SessionChat({
  sessionId,
  currentUserId,
  initialMessages,
  senderNames,
  canPost,
}: SessionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session-chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          // 自分の送信は revalidate 経由でも入るため、id で重複を除く。
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("error");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <section className="rounded border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">チャット</h2>
        {connection === "connecting" ? (
          <span className="text-xs text-gray-400">接続しています…</span>
        ) : null}
        {connection === "error" ? (
          <span className="text-xs text-red-600">
            リアルタイム接続に失敗しました。再読み込みしてください。
          </span>
        ) : null}
      </div>

      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">まだメッセージはありません。</p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            const name = message.sender_id
              ? (senderNames[message.sender_id] ?? "退会したユーザー")
              : "システム";
            return (
              <div key={message.id} className={isMine ? "text-right" : "text-left"}>
                <p className="text-xs text-gray-500">
                  {name}
                  <time className="ml-2" dateTime={message.created_at} suppressHydrationWarning>
                    {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>
                <p
                  className={`mt-1 inline-block max-w-[85%] whitespace-pre-wrap break-words rounded px-3 py-2 text-left text-sm ${
                    isMine ? "bg-gray-900 text-white" : "bg-gray-100"
                  }`}
                >
                  {message.body}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canPost ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await sendChatMessage(formData);
            formRef.current?.reset();
          }}
          className="mt-3 flex gap-2"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <label htmlFor="chat-body" className="sr-only">
            メッセージ
          </label>
          <input
            id="chat-body"
            name="body"
            type="text"
            required
            maxLength={2000}
            autoComplete="off"
            placeholder="メッセージを入力"
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <Button type="submit">送信</Button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-gray-400">閲覧のみのため投稿できません。</p>
      )}
    </section>
  );
}
