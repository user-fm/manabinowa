import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, ROLE_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { startThread } from "./actions";

const ERROR_MESSAGE: Record<string, string> = {
  partner: "相手を選んでください。",
  db: "処理に失敗しました。時間をおいて再度お試しください。",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireRole(["teacher", "volunteer", "community", "admin", "board"]);

  const admin = createAdminClient();
  const { data: myRows } = await admin
    .from("message_thread_participants")
    .select("thread_id, message_threads(id, last_message_at, created_at)")
    .eq("user_id", profile.id);

  const threads = (myRows ?? [])
    .map(
      (row) =>
        row.message_threads as unknown as {
          id: string;
          last_message_at: string | null;
          created_at: string;
        } | null,
    )
    .filter((t) => t !== null)
    .sort((a, b) =>
      (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at),
    );

  // 各スレッドの相手の名前をまとめて引く。
  const threadIds = threads.map((t) => t.id);
  const partnerNames = new Map<string, string>();
  if (threadIds.length > 0) {
    const { data: others } = await admin
      .from("message_thread_participants")
      .select("thread_id, users(full_name)")
      .in("thread_id", threadIds)
      .neq("user_id", profile.id);
    for (const row of others ?? []) {
      const name = (row.users as { full_name?: string } | null)?.full_name;
      if (name) partnerNames.set(row.thread_id as string, name);
    }
  }

  // 連絡できる相手(自分以外の大人ロール)。
  const { data: candidates } = await admin
    .from("users")
    .select("id, full_name, role")
    .in("role", ["teacher", "volunteer", "community", "admin", "board"])
    .neq("id", profile.id)
    .order("full_name")
    .limit(100);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        title="メッセージ"
        lead="教師・ボランティア・地域の方など、大人同士の連絡用です。生徒とのやり取りはセッション画面のチャットをお使いください。"
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}

      <Card>
        <h2 className="text-xs font-bold text-muted">新しいやり取りを始める</h2>
        <form action={startThread} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1">
            <span className="sr-only">相手</span>
            <Select name="partnerId" required defaultValue="">
              <option value="">相手を選んでください</option>
              {(candidates ?? []).map((u) => (
                <option key={u.id as string} value={u.id as string}>
                  {u.full_name as string}（{ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]}）
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit">やり取りを開く</Button>
        </form>
      </Card>

      {threads.length === 0 ? (
        <Card className="mt-4 border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="inbox" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">やり取りはまだありません</p>
          <p className="mt-2 text-xs font-medium text-muted">
            上から相手を選ぶと、新しいやり取りを始められます。
          </p>
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/messages/${t.id}`} className="block">
                <Card className="transition-all hover:border-brand hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Icon name="user" className="size-5" />
                      </span>
                      <span className="text-base font-bold">
                        {partnerNames.get(t.id) ?? "（退会したユーザー）"}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-muted">
                      {fmtDateTime(t.last_message_at ?? t.created_at)}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
