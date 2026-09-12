import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Icon, type IconName } from "@/components/ui/icon";
import { getSessionProfile, type Role } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";

type MenuItem = { label: string; href: string; desc: string; icon: IconName };

// プロトタイプの各ロールホームのメニュー構成に対応
const ROLE_MENU: Record<Role, MenuItem[]> = {
  teacher: [
    {
      label: "ボランティア依頼を作る",
      href: "/teacher/requests/new",
      desc: "教科・学年・内容を指定して募集します",
      icon: "pen",
    },
    {
      label: "依頼の状況",
      href: "/teacher/requests",
      desc: "出した依頼と進み具合を確認",
      icon: "list",
    },
    {
      label: "地域からの依頼",
      href: "/teacher/community-requests",
      desc: "地域からの申し出を確認・選定",
      icon: "inbox",
    },
    {
      label: "オンライン指導",
      href: "/teacher/sessions",
      desc: "予定・実施済みのセッション",
      icon: "video",
    },
    {
      label: "教材ライブラリ",
      href: "/teacher/library",
      desc: "受け入れた地域素材の一覧",
      icon: "book",
    },
  ],
  student: [
    {
      label: "自分のセッション",
      href: "/student/sessions",
      desc: "参加する指導の予定",
      icon: "video",
    },
    {
      label: "振り返り",
      href: "/student/reflections",
      desc: "指導後の振り返りを確認",
      icon: "note",
    },
  ],
  volunteer: [
    {
      label: "スキル登録",
      href: "/volunteer/profile",
      desc: "支援できる教科・学年・時間帯を登録",
      icon: "user",
    },
    {
      label: "学校からの依頼",
      href: "/volunteer/requests",
      desc: "募集中の依頼を探す",
      icon: "inbox",
    },
    {
      label: "オンライン指導",
      href: "/volunteer/sessions",
      desc: "予定・実施済みのセッション",
      icon: "video",
    },
  ],
  community: [
    {
      label: "学校への依頼を作る",
      href: "/community/requests/new",
      desc: "ポスター制作や行事参加などを依頼",
      icon: "pen",
    },
    {
      label: "送信済みの依頼",
      href: "/community/requests",
      desc: "依頼の状況を確認",
      icon: "list",
    },
  ],
  admin: [
    {
      label: "安全アラート",
      href: "/admin/alerts",
      desc: "AI監視の検知結果を確認・対応",
      icon: "shield",
    },
    { label: "ブロックリスト", href: "/admin/blocks", desc: "申請と審査状況の確認", icon: "ban" },
    {
      label: "セッション一覧",
      href: "/admin/sessions",
      desc: "自校のセッションを確認",
      icon: "video",
    },
  ],
  board: [
    {
      label: "月次監査レポート",
      href: "/board/reports",
      desc: "自治体内の活動レポート",
      icon: "note",
    },
    { label: "統計ダッシュボード", href: "/board/stats", desc: "利用状況の統計", icon: "chart" },
  ],
};

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "link",
    title: "AIがつなぐ",
    desc: "依頼の内容から、力になれるボランティアを探して提案します。",
  },
  {
    icon: "video",
    title: "オンラインで学ぶ",
    desc: "距離に関係なく、画面越しに一対一で教えてもらえます。",
  },
  {
    icon: "shield",
    title: "安全を見守る",
    desc: "やり取りは記録され、AIが確認します。保護者の同意も必ず取ります。",
  },
];

export default async function Home() {
  const session = await getSessionProfile();

  // 未ログイン → ランディング
  if (!session) {
    return (
      <main className="flex-1">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <Image
              src="/img/logo_192.png"
              alt=""
              width={84}
              height={84}
              className="mx-auto"
              priority
            />
            <h1 className="mt-6 text-4xl font-bold tracking-wide text-brand-dark">まなびのわ</h1>
            <p className="mt-3 text-base tracking-widest text-brand">途切れない、学びのサイクル</p>
            <p className="mx-auto mt-8 max-w-md text-sm leading-8 text-muted">
              学校と地域のボランティアをつなぎ、
              <br />
              子どもの学習支援をオンラインで届けます。
            </p>
            <Link
              href="/login"
              className="mt-10 inline-flex min-h-12 items-center rounded-md bg-brand px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
            >
              ログインしてはじめる
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-lg border border-line bg-surface p-6 text-center shadow-sm"
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon name={f.icon} className="size-6" />
                </span>
                <h2 className="mt-4 font-medium">{f.title}</h2>
                <p className="mt-2 text-xs leading-6 text-muted">{f.desc}</p>
              </li>
            ))}
          </ul>
        </section>
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-brand" />
          <div>
            <p className="text-xs tracking-wider text-muted">{ROLE_LABEL[profile.role]}のホーム</p>
            <h1 className="text-2xl font-bold">ようこそ、{profile.fullName} さん</h1>
          </div>
        </div>

        {isPending ? (
          <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {profile.role === "student"
              ? "保護者の方の同意を待っています。同意が完了すると各機能が利用できます。"
              : "現在、運営の審査待ちです。承認されると各機能が利用できます。"}
          </p>
        ) : null}

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {menu.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full items-start gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm transition-all hover:border-brand hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon name={item.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs leading-6 text-muted">{item.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
