import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン
  if (!user) {
    return (
      <main className="mx-auto mt-20 max-w-sm text-center">
        <h1 className="text-2xl font-bold">まなびのわ</h1>
        <p className="mt-2 text-sm text-gray-600">途切れない、学びのサイクル</p>
        <Link href="/login" className="mt-6 inline-block rounded border px-4 py-2">
          ログイン
        </Link>
      </main>
    );
  }

  // ログイン済みだが未登録 → オンボーディングへ
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, full_name, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto mt-20 max-w-md px-4 text-center">
      <h1 className="text-2xl font-bold">まなびのわ</h1>
      <p className="mt-4">ようこそ、{profile.full_name} さん</p>
      <p className="mt-1 text-sm text-gray-600">
        役割: {profile.role} / 状態: {profile.account_status}
      </p>
    </main>
  );
}
