import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { COMMUNITY_CATEGORY_LABEL, fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherLibraryPage() {
  const profile = await requireRole(["teacher"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("community_library")
    .select("id, title, category, provider, drive_url, created_at")
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title="教材ライブラリ"
        lead="受け入れた地域からの依頼を教材として保存する場所です。検索・登録は準備中です。"
      />

      {!items || items.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="book" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold">教材はまだありません</p>
          <p className="mt-2 text-xs font-medium text-muted">
            地域からの依頼を受け入れると、ここに蓄積されます。
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-base font-bold">{item.title}</span>
                  <Badge tone="brand">
                    {COMMUNITY_CATEGORY_LABEL[item.category] ?? item.category}
                  </Badge>
                </div>
                <p className="mt-3 text-xs font-medium text-muted">
                  提供: {item.provider ?? "—"} ／ 登録: {fmtDateTime(item.created_at)}
                </p>
                {item.drive_url ? (
                  <a
                    href={item.drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block"
                  >
                    <Button variant="outline">資料を開く</Button>
                  </a>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
