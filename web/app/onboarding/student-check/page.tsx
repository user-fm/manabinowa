import Link from "next/link";

/**
 * B-11〜B-12 生徒の保護者同意待ち画面
 * 保護者がメール内リンクから同意すると利用できるようになる(K-13〜K-15)
 */
export default function StudentCheckPage() {
  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">保護者同意待ち</h1>

      <p className="mt-4 text-sm text-gray-700">
        生徒アカウントの利用には、保護者の同意が必要です。
        <br />
        保護者宛に送信されたメールをご確認ください。
      </p>

      <p className="mt-4 text-xs text-gray-500">※ 同意が完了すると、自動的に利用可能になります。</p>

      <Link href="/" className="mt-6 inline-block text-sm text-gray-900 underline">
        ホームへ戻る
      </Link>
    </main>
  );
}
