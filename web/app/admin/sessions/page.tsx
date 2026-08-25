import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSessionsPage() {
  const profile = await requireRole(["admin"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("volunteer_sessions")
    .select("id, scheduled_at, status, volunteer_requests(subject, grade)")
    .eq("school_id", profile.schoolId)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">セッション一覧</h1>
      <p className="mt-1 text-sm text-gray-500">自校で行われるセッションの一覧です。</p>

      {!sessions || sessions.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">セッションはまだありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => {
            const req = s.volunteer_requests as { subject?: string; grade?: string } | null;
            return (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block p-4 rounded-lg border border-gray-300 bg-white p-6 transition-all hover:border-[#155c38] hover:shadow-md"
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
