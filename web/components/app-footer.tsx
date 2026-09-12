import Link from "next/link";

// 全ページ共通のフッター。問い合わせ(Lフロー)への導線を常設する。
export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted">
        <p>まなびのわ ／ 途切れない、学びのサイクル</p>
        <nav className="flex items-center gap-4">
          <Link href="/inquiries/new" className="hover:text-brand-dark">
            お問い合わせ
          </Link>
          <Link href="/settings" className="hover:text-brand-dark">
            設定
          </Link>
        </nav>
      </div>
    </footer>
  );
}
