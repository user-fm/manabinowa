import Link from "next/link";
import { cardClass } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import {
  COMMUNITY_CATEGORY_LABEL,
  COMMUNITY_STATUS_LABEL,
  fmtDate,
  fmtDateTime,
} from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export default async function CommunityRequestsPage() {
  const profile = await requireRole(["community"]);

  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("community_requests")
    .select("id, title, category, status, due_date, created_at, schools(name)")
    .eq("community_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">送信済みの依頼</h1>
        <Link
          href="/community/requests/new"
          className="rounded border px-3 py-1.5 text-sm bg-[#155c38] text-white hover:bg-[#124c2f]"
        >
          新しく依頼する
        </Link>
      </div>

      {!requests || requests.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          まだ依頼はありません。「新しく依頼する」から送信できます。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li key={r.id} className={cn(cardClass, "p-4")}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-gray-500">
                  {COMMUNITY_STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {COMMUNITY_CATEGORY_LABEL[r.category] ?? r.category} ／ 依頼先:{" "}
                {(r.schools as { name?: string } | null)?.name ?? "—"} ／ 期日:{" "}
                {fmtDate(r.due_date)} ／ 送信: {fmtDateTime(r.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
