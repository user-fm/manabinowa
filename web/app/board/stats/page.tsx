import { cardPlaceholderClass } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function BoardStatsPage() {
  await requireRole(["board"]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">統計ダッシュボード</h1>
      <p className={cn(cardPlaceholderClass, "mt-6 text-sm text-gray-500")}>
        セッション数・マッチング状況などの統計がここに表示されます（準備中）。
      </p>
    </main>
  );
}
