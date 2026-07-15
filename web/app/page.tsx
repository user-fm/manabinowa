import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
// import "./home.css";

const ROLE_LABEL: Record<string, string> = {
  teacher: "教師",
  student: "生徒",
  volunteer: "ボランティア",
  community: "地域住民・団体",
  admin: "学校管理者",
  board: "教育委員会",
};

type MenuItem = { label: string; href?: string };

const ROLE_MENU: Record<string, MenuItem[]> = {
  teacher: [
    { label: "ボランティア依頼を作成", href: "/teacher/requests/new" },
    { label: "依頼の状況" },
    { label: "セッション" },
    { label: "地域からの依頼" },
    { label: "設定" },
  ],
  student: [{ label: "自分のセッション" }, { label: "振り返り" }, { label: "設定" }],
  volunteer: [
    { label: "支援プロフィール登録" },
    { label: "募集中の依頼を探す" },
    { label: "応募・セッション" },
    { label: "メッセージ" },
    { label: "設定" },
  ],
  community: [{ label: "学校への依頼を作成" }, { label: "依頼の状況" }, { label: "設定" }],
  admin: [
    { label: "安全アラート" },
    { label: "ブロックリスト申請" },
    { label: "セッション一覧" },
    { label: "設定" },
  ],
  board: [{ label: "月次監査レポート" }, { label: "統計ダッシュボード" }, { label: "設定" }],
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto mt-20 max-w-sm px-4 text-center">
        <h1 className="text-2xl font-bold">まなびのわ</h1>
        <p className="mt-2 text-sm text-gray-600">途切れない、学びのサイクル</p>
        <Link href="/login" className="mt-6 inline-block rounded border px-4 py-2 text-sm">
          ログイン
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, full_name, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const menu = ROLE_MENU[profile.role] ?? [];
  const isPending = profile.account_status === "pending";

  return (
    <>
      <AppHeader 
        userName={profile.full_name}
        role={ROLE_LABEL[profile.role] ?? profile.role}
      />
      <main className="mx-auto max-w-[960px] px-5 py-[25px]">
        {/* app-headerで表示 */}
        {/* <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{profile.full_name} さん</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded border px-4 py-2 text-sm">
              ログアウト
            </button>
          </form>
        </div> */}

        <p className="mt-6 text-sm text-gray-500">{ROLE_LABEL[profile.role] ?? profile.role} のホーム</p>
        <h1 className="mt-1 w-full text-2xl font-bold">ようこそ、{profile.full_name} さん</h1>

        {isPending ? (
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            現在、運営の審査待ちです。承認されると各機能が利用できます。
          </p>
        ) : null}

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {menu.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} className="block rounded border border-gray-300 bg-white p-4 transition-all hover:border-[#155c38] hover:shadow-md">
                  <span>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between rounded border border-dashed border-gray-300 p-4 text-gray-400">
                  <span>{item.label}</span>
                  <span className="text-xs">準備中</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
      <AppFooter />
    </>
  );
}