import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-bold">学校への依頼を作る</h1>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          現在、運営の審査待ちです。承認されると依頼を送信できるようになります。
        </p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: schools } = await admin.from("schools").select("id, name").order("name");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">学校への依頼を作る</h1>

      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid"
            ? "入力内容を確認してください。"
            : "送信に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <form action={createCommunityRequest} className="mt-6 space-y-4">
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
        <Field label="タイトル" htmlFor="title">
          <Input id="title" name="title" required placeholder="例: 地域文化祭のポスター制作" />
        </Field>
        <Field label="依頼内容" htmlFor="detail">
          <Textarea id="detail" name="detail" required rows={4} />
        </Field>
        <Field label="期日" htmlFor="dueDate" hint="(任意)">
          <Input id="dueDate" name="dueDate" type="date" />
        </Field>
        <Button type="submit">送信する</Button>
      </form>
    </main>
  );
}
