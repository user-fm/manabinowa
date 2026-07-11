import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function MessagesPage() {
  const profile = await requireRole(["teacher", "volunteer", "community", "admin", "board"]);

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("message_thread_participants")
    .select("thread_id, message_threads(id, last_message_at, created_at)")
    .eq("user_id", profile.id);

  const threads = (rows ?? [])
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">メッセージ</h1>
      <p className="mt-1 text-sm text-gray-500">
        大人ロール同士の連絡用です。新規スレッドの作成・返信は準備中です。
      </p>

      {threads.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">スレッドはまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {threads.map((t) => (
            <li key={t.id} className="rounded border p-4">
              <div className="flex items-center justify-between text-sm">
                <span>スレッド</span>
                <span className="text-xs text-gray-500">
                  最終更新: {fmtDateTime(t.last_message_at ?? t.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
