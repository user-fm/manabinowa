import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherSessionsPage() {
  const profile = await requireRole(["teacher"]);

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("volunteer_sessions")
    .select("id, scheduled_at, status, volunteer_requests(subject, grade)")
    .eq("teacher_id", profile.id)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">オンライン指導</h1>

      {!sessions || sessions.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          セッションはまだありません。依頼が成立するとここに表示されます。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => {
            const req = s.volunteer_requests as { subject?: string; grade?: string } | null;
            return (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block rounded border p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {req?.subject ?? "—"}（{req?.grade ?? "—"}）
                    </span>
                    <span className="text-xs text-gray-500">
                      {SESSION_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">日時: {fmtDateTime(s.scheduled_at)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
