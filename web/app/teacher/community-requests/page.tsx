import { cardClass } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import {
  COMMUNITY_CATEGORY_LABEL,
  COMMUNITY_STATUS_LABEL,
  fmtDate,
  fmtDateTime,
} from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export default async function TeacherCommunityRequestsPage() {
  const profile = await requireRole(["teacher"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("community_requests")
    .select("id, title, category, detail, due_date, status, created_at, users(full_name)")
    .eq("target_school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">地域からの依頼</h1>
      <p className="mt-1 text-sm text-gray-500">
        自校に届いた地域からの申し出です。受入・見送りの操作は準備中です。
      </p>

      {!requests || requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">届いている依頼はまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li key={r.id} className={cn(cardClass, "p-4")}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-gray-500">
                  {COMMUNITY_STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {COMMUNITY_CATEGORY_LABEL[r.category] ?? r.category} ／ 依頼者:{" "}
                {(r.users as { full_name?: string } | null)?.full_name ?? "（不明）"} ／ 期日:{" "}
                {fmtDate(r.due_date)} ／ 受付: {fmtDateTime(r.created_at)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
