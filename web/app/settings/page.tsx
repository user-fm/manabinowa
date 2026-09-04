import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionProfile } from "@/lib/auth";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_LABEL, ROLE_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveNotificationPrefs } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  const { profile } = session;

  const admin = createAdminClient();

  let schoolName: string | null = null;
  if (profile.schoolId) {
    const { data: school } = await admin
      .from("schools")
      .select("name")
      .eq("id", profile.schoolId)
      .maybeSingle();
    schoolName = school?.name ?? null;
  }

  const { data: prefs } = await admin
    .from("notification_prefs")
    .select("email_enabled")
    .eq("user_id", profile.id)
    .maybeSingle();

  const { data: categoryRows } = await admin
    .from("notification_categories")
    .select("category, enabled")
    .eq("user_id", profile.id);

  // 行が無い種類は既定で「受け取る」。
  const disabled = new Set(
    (categoryRows ?? [])
      .filter((row) => row.enabled === false)
      .map((row) => row.category as string),
  );

  const account = [
    { label: "氏名", value: profile.fullName },
    { label: "メール", value: session.email },
    { label: "役割", value: ROLE_LABEL[profile.role] },
    ...(schoolName ? [{ label: "学校", value: schoolName }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <PageHeader title="設定" lead="アカウントの情報と、通知の受け取り方を確認できます。" />

      {saved ? (
        <p className="mb-4 rounded-md border border-brand/40 bg-brand-soft p-4 text-sm font-bold text-brand-dark">
          通知の設定を保存しました。
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          保存に失敗しました。時間をおいて再度お試しください。
        </p>
      ) : null}

      <Card>
        <h2 className="font-bold">アカウント</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {account.map((row) => (
            <div key={row.label} className="flex gap-4">
              <dt className="w-20 shrink-0 font-bold text-muted">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs font-medium text-muted">プロフィールの編集は準備中です。</p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">通知</h2>
        <p className="mt-1 text-xs font-medium leading-6 text-muted">
          受け取りたい通知を選べます。安全に関わる通知は、設定にかかわらずお送りする場合があります。
        </p>

        <form action={saveNotificationPrefs} className="mt-5">
          <label className="flex items-start gap-3 rounded-md border border-line p-4 text-sm">
            <input
              type="checkbox"
              name="emailEnabled"
              defaultChecked={prefs?.email_enabled !== false}
              className="mt-0.5 size-4 accent-brand"
            />
            <span>
              <span className="font-bold">メールで通知を受け取る</span>
              <span className="mt-1 block text-xs font-medium text-muted">
                外すと、下の種類にかかわらずメールが届かなくなります。
              </span>
            </span>
          </label>

          <ul className="mt-4 space-y-2">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const meta = NOTIFICATION_CATEGORY_LABEL[category];
              return (
                <li key={category}>
                  <label className="flex items-start gap-3 rounded-md border border-line p-4 text-sm">
                    <input
                      type="checkbox"
                      name={`category_${category}`}
                      defaultChecked={!disabled.has(category)}
                      className="mt-0.5 size-4 accent-brand"
                    />
                    <span>
                      <span className="font-bold">{meta.label}</span>
                      <span className="mt-1 block text-xs font-medium text-muted">{meta.desc}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-line pt-5">
            <Button type="submit">通知の設定を保存する</Button>
          </div>
        </form>

        <p className="mt-4 text-xs font-medium text-muted">
          ※ プッシュ通知への対応は準備中です。現在はメールのみお送りします。
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">サポート</h2>
        <p className="mt-2 text-sm font-medium leading-7">
          困りごとや不具合は{" "}
          <Link href="/inquiries/new" className="font-bold text-brand-dark underline">
            お問い合わせ
          </Link>{" "}
          からご連絡ください。
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">アカウントとデータ</h2>
        <p className="mt-2 text-sm font-medium leading-7 text-muted">
          登録した個人情報の削除を希望される場合は、お問い合わせからお申し出ください。
          運営がご本人であることを確認したうえで削除します。
        </p>
        <Link href="/inquiries/new?category=deletion" className="mt-4 inline-block">
          <Button variant="outline">データの削除を申し出る</Button>
        </Link>
      </Card>
    </main>
  );
}
