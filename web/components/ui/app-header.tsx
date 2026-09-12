import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";

// ログイン後の全ページ共通ヘッダー。メッセージは大人ロールのみ(F-MSG)。
export function AppHeader({ userName, role }: { userName: string; role: Role }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/img/logo_48.png" alt="" width={30} height={30} priority />
            <span className="text-lg font-bold tracking-wide text-brand-dark">まなびのわ</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/" className="hover:text-brand-dark">
              ホーム
            </Link>
            {role !== "student" ? (
              <Link href="/messages" className="hover:text-brand-dark">
                メッセージ
              </Link>
            ) : null}
            <Link href="/settings" className="hover:text-brand-dark">
              設定
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{userName}</span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
