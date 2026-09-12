import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/**
 * B-15〜B-16 ボランティア・地域ユーザーの審査待ち画面
 * - role = volunteer / community の場合に表示される
 * - 運営が approve すると account_status = "active" になり利用可能
 */
export default function ReviewPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-20">
      <div className="rounded-lg border border-line bg-surface p-10 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon name="user" className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-wide">審査中です</h1>
        <p className="mt-4 text-sm font-medium leading-8 text-muted">
          ボランティア／地域ユーザーとしての登録には、
          <br />
          運営による審査が必要です。
        </p>
        <p className="mt-6 text-xs font-medium leading-6 text-muted">
          審査が完了次第、ご登録のメールアドレスにお知らせします。
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-bold text-brand-dark underline underline-offset-4"
        >
          ホームへ戻る
        </Link>
      </div>
    </main>
  );
}
