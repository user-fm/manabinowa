import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createAdminClient } from "@/lib/supabase/admin";
import { signConsent } from "./actions";

export default async function ConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data: record } = await admin
    .from("consent_records")
    .select("id, status, student_id")
    .eq("token", token)
    .maybeSingle();

  if (!record) {
    return (
      <main className="mx-auto mt-16 max-w-md px-4">
        <h1 className="text-xl font-bold">リンクが無効です</h1>
        <p className="mt-3 text-sm text-gray-600">
          このリンクは無効になっています。お子様の登録状況をご確認ください。
        </p>
      </main>
    );
  }

  if (record.status === "signed") {
    return (
      <main className="mx-auto mt-16 max-w-md px-4">
        <h1 className="text-xl font-bold">同意手続きは完了しています</h1>
        <p>ご協力ありがとうございました。お子様はサービスを利用できます。</p>
      </main>
    );
  }

  const { data: student } = await admin
    .from("users")
    .select("full_name, school_id")
    .eq("id", record.student_id)
    .maybeSingle();
  let schoolName: string | null = null;
  if (student?.school_id) {
    const { data: school } = await admin
      .from("schools")
      .select("name")
      .eq("id", student.school_id)
      .maybeSingle();
    schoolName = school?.name ?? null;
  }
  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">保護者の方への同意のお願い</h1>
      <p className="mt-2 text-sm text-gray-600">
        {schoolName ? `${schoolName}の` : ""}
        {student?.full_name ?? "お子さま"} さんが生徒として登録されました。
        利用開始には保護者の同意が必要です。
      </p>
      <div className="mt-4 rounded border p-4 text-sm text-gray-700">
        <p className="font-medium">同意いただく内容</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>オンライン指導セッションへの参加</li>
          <li>安全確保のためのチャット記録の保存と監視</li>
          <li>氏名・学年などの基本情報を学校と担当ボランティアに共有すること</li>
        </ul>
      </div>
      {error ? (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error === "input"
            ? "お名前の入力と、同意のチェックをお願いします。"
            : "処理に失敗しました。時間をおいて再度お試しください。"}
        </p>
      ) : null}

      <form action={signConsent} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="保護者のお名前" htmlFor="parentName">
          <Input id="parentName" name="parentName" required />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" required className="mt-1" />
          <span>上記の内容を確認し、子どもが「まなびのわ」を利用することに同意します。</span>
        </label>
        <Button type="submit">同意して手続きを完了する</Button>
      </form>
    </main>
  );
}
