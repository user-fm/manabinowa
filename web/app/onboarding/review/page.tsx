/**
 * B-15〜B-16 ボランティア・地域ユーザーの審査待ち画面
 * - role = volunteer / community の場合に表示される
 * - 運営が approve すると account_status = "active" になり利用可能
 */

export default function ReviewPage() {
  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-xl font-bold">審査中です</h1>

      <p className="mt-4 text-sm text-gray-700">
        ボランティア／地域ユーザーとしての登録には、
        <br />
        運営による審査が必要です。
      </p>

      <p className="mt-4 text-xs text-gray-500">
        審査が完了次第、メールでお知らせします。
      </p>
    </main>
  );
}
