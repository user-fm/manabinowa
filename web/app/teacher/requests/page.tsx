import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title="依頼の状況"
        lead="出したボランティア依頼と、その進み具合を確認できます。"
        action={
          <Link href="/teacher/requests/new">
            <Button>新しく依頼する</Button>
          </Link>
        }
      />

      {!requests || requests.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="pen" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">まだ依頼はありません</p>
          <p className="mt-2 text-xs font-medium text-muted">
            教科と学年、困っている内容を書くだけで募集できます。
          </p>
          <Link href="/teacher/requests/new" className="mt-6 inline-block">
            <Button variant="outline">最初の依頼を作る</Button>
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/teacher/requests/${r.id}`} className="block">
                <Card className="transition-all hover:border-brand hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base font-bold">
                      {r.subject}（{r.grade}）
                    </span>
                    <Badge tone={toneForStatus(r.status)}>
                      {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted">
                    希望日時: {fmtDateTime(r.desired_at)} ／ 作成: {fmtDateTime(r.created_at)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
