import { Badge, toneForStatus } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import {
  COMMUNITY_CATEGORY_LABEL,
  COMMUNITY_STATUS_LABEL,
  fmtDate,
  fmtDateTime,
} from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title="地域からの依頼"
        lead="自校に届いた地域からの申し出です。受入・見送りの操作は準備中です。"
      />

      {!requests || requests.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="inbox" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">届いている依頼はまだありません</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-base font-bold">{r.title}</span>
                  <Badge tone={toneForStatus(r.status)}>
                    {COMMUNITY_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xs font-medium leading-6 text-muted">
                  {COMMUNITY_CATEGORY_LABEL[r.category] ?? r.category} ／ 依頼者:{" "}
                  {(r.users as { full_name?: string } | null)?.full_name ?? "（不明）"} ／ 期日:{" "}
                  {fmtDate(r.due_date)} ／ 受付: {fmtDateTime(r.created_at)}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7">{r.detail}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
