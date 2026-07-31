import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";

// ログイン後の全ページ共通ヘッダー。メッセージは大人ロールのみ(F-MSG)。
export function AppHeader({ userName, role }: { userName: string; role: Role }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-lg font-bold">
            まなびのわ
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              ホーム
            </Link>
            {role !== "student" ? (
              <Link href="/messages" className="hover:text-gray-900">
                メッセージ
              </Link>
            ) : null}
            <Link href="/settings" className="hover:text-gray-900">
              設定
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-gray-600 sm:inline">{userName}</span>
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
