import { type ScheduleItem, SessionSchedule } from "@/components/session-schedule";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherSessionsPage() {
  const profile = await requireRole(["teacher"]);

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("volunteer_sessions")
    .select(
      "id, scheduled_at, status, volunteer_requests(subject, grade), users!volunteer_sessions_volunteer_id_fkey(full_name)",
    )
    .eq("teacher_id", profile.id)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const items: ScheduleItem[] = (sessions ?? []).map((s) => {
    const req = s.volunteer_requests as { subject?: string; grade?: string } | null;
    const volunteer = s.users as { full_name?: string } | null;
    return {
      id: s.id as string,
      scheduledAt: s.scheduled_at as string | null,
      status: s.status as string,
      subject: req?.subject ?? "—",
      grade: req?.grade ?? "—",
      counterpart: `担当: ${volunteer?.full_name ?? "—"}`,
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title="オンライン指導"
        lead="成立した依頼のセッション予定と、実施済みの記録です。"
      />
      <SessionSchedule items={items} />
    </main>
  );
}
