import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";

// ログイン後の全ページ共通ヘッダー。メッセージは大人ロールのみ(F-MSG)。
export function AppHeader({ userName, role }: { userName: string; role: Role }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-300 bg-white">
      <div className="mx-auto flex items-center justify-between px-7 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <Image
              src="/img/logo_32.png"
              alt="まなびのわ"
              width={32}
              height={32}
              className="h-8 w-8"
            />
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
