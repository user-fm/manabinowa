import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { type AppRole, allowedRolesFor, classifyUserByEmail } from "@/lib/auth/classify-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

const ROLE_LABELS: Record<AppRole, string> = {
  teacher: "教師",
  student: "生徒",
  volunteer: "ボランティア",
  community: "地域住民・団体",
  admin: "学校管理者",
  board: "教育委員会",
};

const ERROR_MESSAGES: Record<string, string> = {
  role: "このアカウントでは選べない役割です。",
  parent: "生徒として登録するには保護者のメールアドレスが必要です。",
  school: "学校の情報を確認できませんでした。",
  db: "登録に失敗しました。時間をおいて再度お試しください。",
  invalid: "入力内容を確認してください。",
};

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // 登録済みならトップへ
  const admin = createAdminClient();
  const { data: existing } = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/");

  // B-07〜B-08: メールドメインで校内/個人を判定し、選べるロールを絞り込む
  const classification = await classifyUserByEmail(user.email);
  const availableRoles = allowedRolesFor(classification);

  const meta = user.user_metadata ?? {};
  const defaultName = (meta.full_name as string) ?? (meta.name as string) ?? "";

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">登録を完了してください</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>
      <p className="mt-1 text-xs text-gray-500">
        {classification.kind === "school"
          ? `${classification.school.name} の校内アカウントとして登録します`
          : "個人アカウントとして登録します（ボランティア／地域）"}
      </p>

      {error ? (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid}
        </p>
      ) : null}

      <form
        action={completeOnboarding}
        className="mt-6 space-y-4 rounded-lg border border-gray-300 bg-white p-5"
      >
        <Field label="役割" htmlFor="role">
          <Select id="role" name="role" required defaultValue="">
            <option value="">選択してください</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="氏名" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={defaultName} required />
        </Field>

        {availableRoles.includes("student") ? (
          <Field
            label="保護者メールアドレス"
            htmlFor="parentEmail"
            hint="(生徒として登録する場合は必須)"
          >
            <Input
              id="parentEmail"
              name="parentEmail"
              type="email"
              placeholder="parent@example.com"
            />
          </Field>
        ) : null}

        <Button type="submit">登録する</Button>
      </form>
    </main>
  );
}
