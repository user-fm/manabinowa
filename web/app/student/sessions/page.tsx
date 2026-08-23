import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StudentSessionsPage() {
  const profile = await requireRole(["student"]);

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("session_participants")
    .select(
      "session_id, volunteer_sessions(id, scheduled_at, status, volunteer_requests(subject, grade))",
    )
    .eq("user_id", profile.id);

  const sessions = (rows ?? [])
    .map(
      (row) =>
        row.volunteer_sessions as unknown as {
          id: string;
          scheduled_at: string | null;
          status: string;
          volunteer_requests: { subject?: string; grade?: string } | null;
        } | null,
    )
    .filter((s) => s !== null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">自分のセッション</h1>

      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">参加予定のセッションはまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="block rounded border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {s.volunteer_requests?.subject ?? "—"}（{s.volunteer_requests?.grade ?? "—"}）
                  </span>
                  <span className="text-xs text-gray-500">
                    {SESSION_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">日時: {fmtDateTime(s.scheduled_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
