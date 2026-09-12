import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, SESSION_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSessionsPage() {
  const profile = await requireRole(["admin"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Card className="border-red-300 bg-red-50 text-sm font-bold text-red-700">
          学校が未設定です。登録をやり直してください。
        </Card>
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="学校管理者"
        title="セッション一覧"
        lead="自校で行われるオンライン指導の一覧です。内容の確認ができます。"
      />

      {!sessions || sessions.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="video" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">セッションはまだありません</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const req = s.volunteer_requests as { subject?: string; grade?: string } | null;
            return (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="block">
                  <Card className="transition-all hover:border-brand hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base font-bold">
                        {req?.subject ?? "—"}（{req?.grade ?? "—"}）
                      </span>
                      <Badge tone={toneForStatus(s.status)}>
                        {SESSION_STATUS_LABEL[s.status] ?? s.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs font-medium text-muted">
                      日時: {fmtDateTime(s.scheduled_at)}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
