import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeacherRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["teacher"]);

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("id, subject, grade, detail, status, desired_at, created_at")
    .eq("id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!request) notFound();

  // マッチング候補(match_offers)。候補生成(AIマッチング)は段階2後半で実装
  const { data: offers } = await admin
    .from("match_offers")
    .select("id, status, offered_at, expires_at, users(full_name)")
    .eq("request_id", id)
    .order("offered_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/teacher/requests" className="text-sm text-gray-500 hover:text-gray-900">
        ← 依頼の状況へ戻る
      </Link>

      <h1 className="mt-3 text-xl font-bold">
        {request.subject}（{request.grade}）
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        状態: {REQUEST_STATUS_LABEL[request.status] ?? request.status} ／ 希望日時:{" "}
        {fmtDateTime(request.desired_at)} ／ 作成: {fmtDateTime(request.created_at)}
      </p>

      <section className="mt-6 rounded border p-4">
        <h2 className="text-sm font-medium text-gray-500">依頼内容</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{request.detail}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">マッチング候補</h2>
        {!offers || offers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            候補はまだありません。候補の提案（マッチング）は準備中です。
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {offers.map((o) => (
              <li key={o.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>{(o.users as { full_name?: string } | null)?.full_name ?? "（不明）"}</span>
                  <span className="text-xs text-gray-500">{o.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  提示: {fmtDateTime(o.offered_at)} ／ 期限: {fmtDateTime(o.expires_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
