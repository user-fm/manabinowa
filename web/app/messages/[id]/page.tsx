import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "../actions";

const ERROR_MESSAGE: Record<string, string> = {
  empty: "メッセージを入力してください。",
  too_long: "メッセージが長すぎます（2000文字以内）。",
  db: "送信に失敗しました。時間をおいて再度お試しください。",
};

type MessageRow = {
  id: number;
  sender_id: string | null;
  body: string;
  created_at: string;
};

// Nフロー: 大人ロール同士の1対1のやり取り。
export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await requireRole(["teacher", "volunteer", "community", "admin", "board"]);

  const admin = createAdminClient();

  // 参加者でなければ一覧へ戻す。
  const { data: membership } = await admin
    .from("message_thread_participants")
    .select("thread_id")
    .eq("thread_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership) redirect("/messages");

  const { data: partnerRow } = await admin
    .from("message_thread_participants")
    .select("users(full_name)")
    .eq("thread_id", id)
    .neq("user_id", profile.id)
    .maybeSingle();
  const partnerName =
    (partnerRow?.users as { full_name?: string } | null)?.full_name ?? "（退会したユーザー）";

  const { data: messageRows } = await admin
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (messageRows ?? []) as MessageRow[];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader
        title={partnerName}
        eyebrow="メッセージ"
        back={{ href: "/messages", label: "メッセージ一覧へ戻る" }}
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}

      <Card>
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-muted">
            まだメッセージはありません。下の欄から送ってみてください。
          </p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const isMine = m.sender_id === profile.id;
              return (
                <li key={m.id} className={isMine ? "text-right" : "text-left"}>
                  <p className="text-xs font-bold text-muted">
                    {isMine ? "自分" : partnerName}
                    <time className="ml-2 font-medium" dateTime={m.created_at}>
                      {fmtDateTime(m.created_at)}
                    </time>
                  </p>
                  <p
                    className={`mt-1.5 inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-2.5 text-left text-sm font-medium leading-7 ${
                      isMine ? "bg-brand text-white" : "border border-line bg-background"
                    }`}
                  >
                    {m.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <form action={sendMessage} className="mt-5 flex gap-2 border-t border-line pt-5">
          <input type="hidden" name="threadId" value={id} />
          <label htmlFor="message-body" className="sr-only">
            メッセージ
          </label>
          <Input
            id="message-body"
            name="body"
            required
            maxLength={2000}
            autoComplete="off"
            placeholder="メッセージを入力"
            className="mt-0 flex-1"
          />
          <Button type="submit">送信</Button>
        </form>
      </Card>
    </main>
  );
}
