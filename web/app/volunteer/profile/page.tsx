import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveVolunteerProfile } from "./actions";

export default async function VolunteerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const profile = await requireRole(["volunteer"]);
  const { saved, error } = await searchParams;

  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("volunteer_offers")
    .select("id, subjects, grades, availability, intro")
    .eq("volunteer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="ボランティア"
        title="スキル登録"
        lead="支援できる内容を登録すると、学校からの依頼と結び付けやすくなります。"
      />

      {saved ? (
        <p className="mb-6 rounded-md border border-brand/40 bg-brand-soft p-4 text-sm font-bold text-brand-dark">
          保存しました。
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error === "invalid"
            ? "教科と学年は必須です。"
            : "保存に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <Card className="p-6 sm:p-8">
        <form action={saveVolunteerProfile} className="space-y-6">
          <Field label="支援できる教科" htmlFor="subjects" hint="カンマ区切り">
            <Input
              id="subjects"
              name="subjects"
              required
              placeholder="例: 数学, 英語"
              defaultValue={(offer?.subjects ?? []).join(", ")}
            />
          </Field>
          <Field label="対象学年" htmlFor="grades" hint="カンマ区切り">
            <Input
              id="grades"
              name="grades"
              required
              placeholder="例: 中学1年, 中学2年"
              defaultValue={(offer?.grades ?? []).join(", ")}
            />
          </Field>
          <Field label="対応できる時間帯" htmlFor="availability" hint="任意">
            <Input
              id="availability"
              name="availability"
              placeholder="例: 平日の夕方、土曜午前"
              defaultValue={offer?.availability ?? ""}
            />
          </Field>
          <Field label="自己紹介" htmlFor="intro" hint="任意">
            <Textarea
              id="intro"
              name="intro"
              rows={5}
              placeholder="これまでの経験や、得意な教え方などを書いてください。"
              defaultValue={offer?.intro ?? ""}
            />
          </Field>
          <div className="border-t border-line pt-6">
            <Button type="submit">{offer ? "更新する" : "登録する"}</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
