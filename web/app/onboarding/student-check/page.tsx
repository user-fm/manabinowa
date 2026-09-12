import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/**
 * B-11〜B-12 生徒の保護者同意待ち画面
 * 保護者がメール内リンクから同意すると利用できるようになる(K-13〜K-15)
 */
export default function StudentCheckPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-20">
      <div className="rounded-lg border border-line bg-surface p-10 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon name="shield" className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-wide">保護者同意待ち</h1>
        <p className="mt-4 text-sm font-medium leading-8 text-muted">
          生徒アカウントの利用には、保護者の同意が必要です。
          <br />
          保護者宛に送信されたメールをご確認ください。
        </p>
        <p className="mt-6 text-xs font-medium leading-6 text-muted">
          ※ 同意が完了すると、自動的に利用できるようになります。
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
