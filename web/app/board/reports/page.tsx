import { requireRole } from "@/lib/auth";

export default async function BoardReportsPage() {
  await requireRole(["board"]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">月次監査レポート</h1>
      <p className="mt-6 rounded border border-dashed p-6 text-sm text-gray-500">
        自治体内の活動状況・安全対応の月次レポートがここに表示されます（準備中）。
      </p>
    </main>
  );
}
