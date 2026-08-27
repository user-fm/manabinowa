import { cardClass } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { BLOCK_STATUS_LABEL, fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export default async function AdminBlocksPage() {
  const profile = await requireRole(["admin"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: blocks } = await admin
    .from("block_list")
    .select("id, reason, status, created_at, decided_at")
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">ブロックリスト</h1>
      <p className="mt-1 text-sm text-gray-500">
        自校からの申請と審査状況です。申請は安全アラート画面から行えます。
      </p>

      {!blocks || blocks.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">申請はありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {blocks.map((b) => (
            <li key={b.id} className={cn(cardClass, "p-4")}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{b.reason}</span>
                <span className="text-xs text-gray-500">
                  {BLOCK_STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                申請: {fmtDateTime(b.created_at)} ／ 審査: {fmtDateTime(b.decided_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
