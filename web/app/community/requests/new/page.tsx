import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { COMMUNITY_CATEGORY_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCommunityRequest } from "./actions";

export default async function NewCommunityRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole(["community"]);
  const { error } = await searchParams;

  // 審査待ちの間は送信不可(開発中は許可)
  const canSubmit = profile.accountStatus === "active" || process.env.NODE_ENV !== "production";
  if (!canSubmit) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <PageHeader eyebrow="地域住民・団体" title="学校への依頼を作る" />
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          現在、運営の審査待ちです。承認されると依頼を送信できるようになります。
        </p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: schools } = await admin.from("schools").select("id, name").order("name");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="地域住民・団体"
        title="学校への依頼を作る"
        lead="ポスター制作や行事への参加など、学校へのお申し出を送れます。"
        back={{ href: "/community/requests", label: "送信済みの依頼へ戻る" }}
      />

      {error ? (
        <p className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "送信に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <Card className="p-6 sm:p-8">
        <form action={createCommunityRequest} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="依頼先の学校" htmlFor="schoolId">
              <Select id="schoolId" name="schoolId" required defaultValue="">
                <option value="">選択してください</option>
                {(schools ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="種類" htmlFor="category">
              <Select id="category" name="category" required defaultValue="">
                <option value="">選択してください</option>
                {Object.entries(COMMUNITY_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="タイトル" htmlFor="title">
            <Input id="title" name="title" required placeholder="例: 地域文化祭のポスター制作" />
          </Field>
          <Field label="依頼内容" htmlFor="detail">
            <Textarea
              id="detail"
              name="detail"
              required
              rows={6}
              placeholder="お願いしたい内容や、地域側で用意できるものを書いてください。"
            />
          </Field>
          <Field label="期日" htmlFor="dueDate" hint="任意">
            <Input id="dueDate" name="dueDate" type="date" />
          </Field>
          <div className="border-t border-line pt-6">
            <Button type="submit">送信する</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
