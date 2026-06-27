import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const ROLES = [
  { value: "teacher", label: "教師" },
  { value: "student", label: "生徒" },
  { value: "volunteer", label: "ボランティア" },
  { value: "community", label: "地域住民・団体" },
  { value: "admin", label: "学校管理者" },
  { value: "board", label: "教育委員会" },
];

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 登録済みならトップへ
  const admin = createAdminClient();
  const { data: existing } = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/");

  const { data: schools } = await admin.from("schools").select("id, name").order("name");

  const meta = user.user_metadata ?? {};
  const defaultName = (meta.full_name as string) ?? (meta.name as string) ?? "";

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">登録を完了してください</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>

      <form action={completeOnboarding} className="mt-6 space-y-4">
        <Field label="役割" htmlFor="role">
          <Select id="role" name="role" required defaultValue="">
            <option value="">選択してください</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="氏名" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={defaultName} required />
        </Field>

        <Field label="学校" htmlFor="schoolId" hint="(教師・生徒・学校管理者は必須)">
          <Select id="schoolId" name="schoolId" defaultValue="">
            <option value="">選択しない</option>
            {(schools ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit">登録する</Button>
      </form>
    </main>
  );
}
