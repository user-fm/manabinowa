import { type ScheduleItem, SessionSchedule } from "@/components/session-schedule";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function VolunteerSessionsPage() {
  const profile = await requireRole(["volunteer"]);

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("volunteer_sessions")
    .select("id, scheduled_at, status, volunteer_requests(subject, grade), schools(name)")
    .eq("volunteer_id", profile.id)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const items: ScheduleItem[] = (sessions ?? []).map((s) => {
    const req = s.volunteer_requests as { subject?: string; grade?: string } | null;
    const school = s.schools as { name?: string } | null;
    return {
      id: s.id as string,
      scheduledAt: s.scheduled_at as string | null,
      status: s.status as string,
      subject: req?.subject ?? "—",
      grade: req?.grade ?? "—",
      counterpart: school?.name ?? "—",
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">オンライン指導</h1>
      <SessionSchedule items={items} />
    </main>
  );
}
