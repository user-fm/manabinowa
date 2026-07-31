import { redirect } from "next/navigation";
import { type AppRole, allowedRolesFor, classifyUserByEmail } from "@/lib/auth/classify-user";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./profile/actions";

const ROLE_LABELS: Record<AppRole, string> = {
  teacher: "教師",
  student: "生徒",
  volunteer: "ボランティア",
  community: "地域住民・団体",
  admin: "学校管理者",
  board: "教育委員会",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // 登録済みならトップへ
  const admin = createAdminClient();
  const { data: existing } = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/");

  // メールドメインで校内/個人を判定し、選べるロールを絞り込む。
  //   校内(学校ドメイン) → 教師 / 生徒 / 学校管理者 / 教育委員会
  //   個人(個人 Gmail 等) → ボランティア / 地域住民・団体(運営審査あり)
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

      <form action={completeOnboarding} className="mt-6 space-y-4">
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

        <Button type="submit">登録する</Button>
      </form>
    </main>
  );
}
