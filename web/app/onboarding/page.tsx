import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

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

  // すでに登録済みならトップへ
  const admin = createAdminClient();
  const { data: existing } = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/");

  const meta = user.user_metadata ?? {};
  const defaultName = (meta.full_name as string) ?? (meta.name as string) ?? "";

  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">登録を完了してください</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>

      <form action={completeOnboarding} className="mt-6 space-y-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            役割
          </label>
          <select id="role" name="role" required className="mt-1 w-full rounded border p-2">
            <option value="">選択してください</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">
            氏名
          </label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={defaultName}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          登録する
        </button>
      </form>
    </main>
  );
}
