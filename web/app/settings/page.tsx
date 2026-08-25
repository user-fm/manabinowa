import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SettingsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  const { profile } = session;

  let schoolName: string | null = null;
  if (profile.schoolId) {
    const admin = createAdminClient();
    const { data: school } = await admin
      .from("schools")
      .select("name")
      .eq("id", profile.schoolId)
      .maybeSingle();
    schoolName = school?.name ?? null;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">設定</h1>

      <section className="mt-6 rounded-lg border border-gray-300 bg-white p-5">
        <h2 className="font-medium">アカウント</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="w-24 text-gray-500">氏名</dt>
            <dd>{profile.fullName}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 text-gray-500">メール</dt>
            <dd>{session.email}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 text-gray-500">役割</dt>
            <dd>{ROLE_LABEL[profile.role]}</dd>
          </div>
          {schoolName ? (
            <div className="flex gap-4">
              <dt className="w-24 text-gray-500">学校</dt>
              <dd>{schoolName}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-gray-400">プロフィールの編集は準備中です。</p>
      </section>

      <section className="mt-4 border border-dashed rounded-lg border-gray-300 bg-white p-5">
        <h2 className="font-medium text-gray-400">通知</h2>
        <p className="mt-2 text-sm text-gray-400">
          メール・プッシュ通知の設定がここに表示されます（準備中）。
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-gray-300 bg-white p-5">
        <h2 className="font-medium">サポート</h2>
        <p className="mt-2 text-sm">
          困りごとや不具合は{" "}
          <Link href="/inquiries/new" className="text-blue-700 underline">
            お問い合わせ
          </Link>{" "}
          からご連絡ください。
        </p>
      </section>
    </main>
  );
}
