import { type ScheduleItem, SessionSchedule } from "@/components/session-schedule";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
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

  const items: ScheduleItem[] = (rows ?? [])
    .map(
      (row) =>
        row.volunteer_sessions as unknown as {
          id: string;
          scheduled_at: string | null;
          status: string;
          volunteer_requests: { subject?: string; grade?: string } | null;
        } | null,
    )
    .filter((s) => s !== null)
    .map((s) => ({
      id: s.id,
      scheduledAt: s.scheduled_at,
      status: s.status,
      subject: s.volunteer_requests?.subject ?? "—",
      grade: s.volunteer_requests?.grade ?? "—",
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="生徒"
        title="自分のセッション"
        lead="参加する指導の予定と、これまでに受けた指導の記録です。"
      />
      <SessionSchedule items={items} />
    </main>
  );
}
