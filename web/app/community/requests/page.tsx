import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function CommunityRequestsPage() {
  const profile = await requireRole(["community"]);

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("community_requests")
    .select("id, title, category, status, due_date, created_at, schools(name)")
    .eq("community_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="地域住民・団体"
        title="送信済みの依頼"
        lead="学校へ送った申し出と、その受入状況です。"
        action={
          <Link href="/community/requests/new">
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
            ポスター制作や行事への参加など、学校へお申し出を送れます。
          </p>
          <Link href="/community/requests/new" className="mt-6 inline-block">
            <Button variant="outline">最初の依頼を作る</Button>
          </Link>
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
                  {COMMUNITY_CATEGORY_LABEL[r.category] ?? r.category} ／ 依頼先:{" "}
                  {(r.schools as { name?: string } | null)?.name ?? "—"} ／ 期日:{" "}
                  {fmtDate(r.due_date)} ／ 送信: {fmtDateTime(r.created_at)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
