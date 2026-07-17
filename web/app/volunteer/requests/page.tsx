import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function VolunteerRequestsPage() {
  const profile = await requireRole(["volunteer"]);

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("volunteer_requests")
    .select("id, subject, grade, detail, desired_at, created_at, schools(name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">学校からの依頼</h1>
      <p className="mt-1 text-sm text-gray-500">募集中の依頼の一覧です。応募機能は準備中です。</p>

      {profile.accountStatus === "pending" ? (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          運営の審査待ちです。承認されると応募できるようになります。
        </p>
      ) : null}

      {!requests || requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">募集中の依頼はまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {r.subject}（{r.grade}）
                </span>
                <span className="text-xs text-gray-400">応募は準備中</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {(r.schools as { name?: string } | null)?.name ?? "—"} ／ 希望日時:{" "}
                {fmtDateTime(r.desired_at)}
              </p>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{r.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
