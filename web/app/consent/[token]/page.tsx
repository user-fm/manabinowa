import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
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
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-20">
        <div className="rounded-lg border border-line bg-surface p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-wide">リンクが無効です</h1>
          <p className="mt-4 text-sm font-medium leading-8 text-muted">
            このリンクは無効になっています。
            <br />
            お子さまの登録状況をご確認ください。
          </p>
        </div>
      </main>
    );
  }

  if (record.status === "signed") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-20">
        <div className="rounded-lg border border-line bg-surface p-10 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="check" className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-wide">同意手続きは完了しています</h1>
          <p className="mt-4 text-sm font-medium leading-8 text-muted">
            ご協力ありがとうございました。
            <br />
            お子さまはサービスを利用できます。
          </p>
        </div>
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
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="rounded-lg border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-wide">保護者の方への同意のお願い</h1>
        <p className="mt-3 text-sm font-medium leading-7 text-muted">
          {schoolName ? `${schoolName}の` : ""}
          {student?.full_name ?? "お子さま"} さんが生徒として登録されました。
          利用開始には保護者の同意が必要です。
        </p>

        <div className="mt-6 rounded-md border border-line bg-brand-soft/50 p-5 text-sm">
          <p className="font-bold">同意いただく内容</p>
          <ul className="mt-3 space-y-2">
            {[
              "オンライン指導セッションへの参加",
              "安全確保のためのチャット記録の保存と監視",
              "氏名・学年などの基本情報を学校と担当ボランティアに共有すること",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 font-medium leading-6">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error === "input"
              ? "お名前の入力と、同意のチェックをお願いします。"
              : "処理に失敗しました。時間をおいて再度お試しください。"}
          </p>
        ) : null}

        <form action={signConsent} className="mt-8 space-y-6">
          <input type="hidden" name="token" value={token} />
          <Field label="保護者のお名前" htmlFor="parentName">
            <Input id="parentName" name="parentName" required placeholder="山田 花子" />
          </Field>
          <label className="flex items-start gap-3 rounded-md border border-line p-4 text-sm font-medium leading-6">
            <input type="checkbox" name="agree" required className="mt-1 size-4 accent-brand" />
            <span>上記の内容を確認し、子どもが「まなびのわ」を利用することに同意します。</span>
          </label>
          <Button type="submit" className="w-full">
            同意して手続きを完了する
          </Button>
        </form>
      </div>
    </main>
  );
}
