import { Badge, toneForStatus } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { BLOCK_STATUS_LABEL, fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminBlocksPage() {
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
  const { data: blocks } = await admin
    .from("block_list")
    .select("id, reason, status, created_at, decided_at")
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="学校管理者"
        title="ブロックリスト"
        lead="自校からの申請と審査状況です。申請は安全アラートの画面から行えます。"
      />

      {!blocks || blocks.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="ban" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">申請はありません</p>
          <p className="mt-2 text-xs font-medium text-muted">
            安全アラートの画面から、対象のボランティアのブロックを申請できます。
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {blocks.map((b) => (
            <li key={b.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-bold leading-6">{b.reason}</span>
                  <Badge tone={toneForStatus(b.status)}>
                    {BLOCK_STATUS_LABEL[b.status] ?? b.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xs font-medium text-muted">
                  申請: {fmtDateTime(b.created_at)} ／ 審査: {fmtDateTime(b.decided_at)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
