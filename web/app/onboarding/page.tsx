import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

const SCHOOL_ROLES = [
  { value: "teacher", label: "教師" },
  { value: "student", label: "生徒" },
  { value: "admin", label: "学校管理者" },
  { value: "board", label: "教育委員会" },
];

const PERSONAL_ROLES = [
  { value: "volunteer", label: "ボランティア" },
  { value: "community", label: "地域住民・団体" },
];

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

  // メールドメインから所属校を特定
  const domain = user.email.split("@")[1] ?? "";
  const { data: school } = await admin
    .from("schools")
    .select("id, name")
    .eq("workspace_domain", domain)
    .maybeSingle();

  const roles = school ? SCHOOL_ROLES : PERSONAL_ROLES;

  const meta = user.user_metadata ?? {};
  const defaultName = (meta.full_name as string) ?? (meta.name as string) ?? "";

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">登録を完了してください</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>

      {school && (
        <p className="mt-3 text-sm">
          所属校: <span className="font-medium">{school.name}</span>
        </p>
      )}

      <form action={completeOnboarding} className="mt-6 space-y-4">
        <Field label="役割" htmlFor="role">
          <Select id="role" name="role" required defaultValue="">
            <option value="">選択してください</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
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
