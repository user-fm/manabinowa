import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">スキル登録</h1>
      <p className="mt-1 text-sm text-gray-500">
        支援できる内容を登録すると、学校からの依頼と結び付けやすくなります。
      </p>

      {saved ? (
        <p className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          保存しました。
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid"
            ? "教科と学年は必須です。"
            : "保存に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <form action={saveVolunteerProfile} className="mt-6 space-y-4">
        <Field label="支援できる教科" htmlFor="subjects" hint="(カンマ区切り)">
          <Input
            id="subjects"
            name="subjects"
            required
            placeholder="例: 数学, 英語"
            defaultValue={(offer?.subjects ?? []).join(", ")}
          />
        </Field>
        <Field label="対象学年" htmlFor="grades" hint="(カンマ区切り)">
          <Input
            id="grades"
            name="grades"
            required
            placeholder="例: 中学1年, 中学2年"
            defaultValue={(offer?.grades ?? []).join(", ")}
          />
        </Field>
        <Field label="対応できる時間帯" htmlFor="availability" hint="(任意)">
          <Input
            id="availability"
            name="availability"
            placeholder="例: 平日の夕方、土曜午前"
            defaultValue={offer?.availability ?? ""}
          />
        </Field>
        <Field label="自己紹介" htmlFor="intro" hint="(任意)">
          <Textarea id="intro" name="intro" rows={4} defaultValue={offer?.intro ?? ""} />
        </Field>
        <Button type="submit">{offer ? "更新する" : "登録する"}</Button>
      </form>
    </main>
  );
}
