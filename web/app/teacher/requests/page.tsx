import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherRequestsPage() {
  const profile = await requireRole(["teacher"]);

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("volunteer_requests")
    .select("id, subject, grade, status, desired_at, created_at")
    .eq("teacher_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">依頼の状況</h1>
        <Link
          href="/teacher/requests/new"
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          新しく依頼する
        </Link>
      </div>

      {!requests || requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          まだ依頼はありません。「新しく依頼する」から作成できます。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/teacher/requests/${r.id}`}
                className="block rounded border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {r.subject}（{r.grade}）
                  </span>
                  <span className="text-xs text-gray-500">
                    {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  希望日時: {fmtDateTime(r.desired_at)} ／ 作成: {fmtDateTime(r.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
