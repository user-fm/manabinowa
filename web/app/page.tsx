import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { getSessionProfile, type Role } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";

type MenuItem = { label: string; href: string; desc: string };

// プロトタイプの各ロールホームのメニュー構成に対応
const ROLE_MENU: Record<Role, MenuItem[]> = {
  teacher: [
    {
      label: "ボランティア依頼を作る",
      href: "/teacher/requests/new",
      desc: "教科・学年・内容を指定して募集します",
    },
    { label: "依頼の状況", href: "/teacher/requests", desc: "出した依頼と進み具合を確認" },
    {
      label: "地域からの依頼",
      href: "/teacher/community-requests",
      desc: "地域からの申し出を確認・選定",
    },
    { label: "オンライン指導", href: "/teacher/sessions", desc: "予定・実施済みのセッション" },
    { label: "教材ライブラリ", href: "/teacher/library", desc: "受け入れた地域素材の一覧" },
  ],
  student: [
    { label: "自分のセッション", href: "/student/sessions", desc: "参加する指導の予定" },
    { label: "振り返り", href: "/student/reflections", desc: "指導後の振り返りを確認" },
  ],
  volunteer: [
    {
      label: "スキル登録",
      href: "/volunteer/profile",
      desc: "支援できる教科・学年・時間帯を登録",
    },
    { label: "学校からの依頼", href: "/volunteer/requests", desc: "募集中の依頼を探す" },
    { label: "オンライン指導", href: "/volunteer/sessions", desc: "予定・実施済みのセッション" },
  ],
  community: [
    {
      label: "学校への依頼を作る",
      href: "/community/requests/new",
      desc: "ポスター制作や行事参加などを依頼",
    },
    { label: "送信済みの依頼", href: "/community/requests", desc: "依頼の状況を確認" },
  ],
  admin: [
    { label: "安全アラート", href: "/admin/alerts", desc: "AI監視の検知結果を確認・対応" },
    { label: "ブロックリスト", href: "/admin/blocks", desc: "申請と審査状況の確認" },
    { label: "セッション一覧", href: "/admin/sessions", desc: "自校のセッションを確認" },
  ],
  board: [
    { label: "月次監査レポート", href: "/board/reports", desc: "自治体内の活動レポート" },
    { label: "統計ダッシュボード", href: "/board/stats", desc: "利用状況の統計" },
  ],
};

export default async function Home() {
  const session = await getSessionProfile();

  // 未ログイン → ランディング
  if (!session) {
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
  if (!session.profile) redirect("/onboarding");

  const { profile } = session;
  const menu = ROLE_MENU[profile.role] ?? [];
  const isPending = profile.accountStatus === "pending";

  return (
    <>
      <AppHeader userName={profile.fullName} role={profile.role} />
      <main className="mx-auto max-w-[960px] px-5 py-[25px]">
        <p className="mt-6 text-sm text-gray-500">{ROLE_LABEL[profile.role]}のホーム</p>
        <h1 className="mt-1 w-full text-2xl font-bold">ようこそ、{profile.fullName} さん</h1>

        {isPending ? (
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            現在、運営の審査待ちです。承認されると各機能が利用できます。
          </p>
        ) : null}

        <ul className="mt-6 grid gap-5 sm:grid-cols-3">
          {menu.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block min-h-[140px] rounded-lg border border-gray-300 bg-white p-6 transition-all hover:border-[#155c38] hover:shadow-md">
                <span className="text-lg font-medium">{item.label}</span>
                <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
