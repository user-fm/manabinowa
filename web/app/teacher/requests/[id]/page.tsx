import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  fmtDateTime,
  MATCH_OFFER_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { expireStaleOffers, findCandidates } from "@/lib/matching";
import { createAdminClient } from "@/lib/supabase/admin";
import { offerToVolunteer, regenerateCandidates } from "./actions";

const ERROR_MESSAGE: Record<string, string> = {
  offer: "依頼の送信に失敗しました。時間をおいて再度お試しください。",
  closed: "この依頼はすでに成立・終了しているため、追加の依頼は送れません。",
};

const NOTICE_MESSAGE: Record<string, string> = {
  offered: "ボランティアへ依頼を送りました。48時間以内の返答をお待ちください。",
  refreshed: "候補を検索し直しました。",
};

export default async function TeacherRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; offered?: string; refreshed?: string }>;
}) {
  const { id } = await params;
  const { error, offered, refreshed } = await searchParams;
  const profile = await requireRole(["teacher"]);

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("id, subject, grade, detail, status, desired_at, created_at")
    .eq("id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!request) notFound();

  // D-13: 表示前に承諾期限切れを反映してから提示状況を読む。
  await expireStaleOffers();

  const { data: offers } = await admin
    .from("match_offers")
    .select("id, status, offered_at, expires_at, volunteer_id, users(full_name)")
    .eq("request_id", id)
    .order("offered_at", { ascending: false });

  // 成立済みなら D-15(セッション)への導線を出す。
  const { data: session } = await admin
    .from("volunteer_sessions")
    .select("id, status, scheduled_at, users!volunteer_sessions_volunteer_id_fkey(full_name)")
    .eq("request_id", id)
    .maybeSingle();

  const isSettled = request.status === "matched" || request.status === "closed";
  // D-10: 未提示のボランティアだけを候補として出す(提示済みは DB 関数側で除外)。
  const candidates = isSettled ? [] : await findCandidates(id);
  const usesKeywordMatch = candidates.some((c) => c.matchType === "keyword");
  const notice = offered ? NOTICE_MESSAGE.offered : refreshed ? NOTICE_MESSAGE.refreshed : null;

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

      {error ? (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <section className="mt-6 rounded border p-4">
        <h2 className="text-sm font-medium text-gray-500">依頼内容</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{request.detail}</p>
      </section>

      {session ? (
        <section className="mt-6 rounded border border-emerald-300 bg-emerald-50 p-4">
          <h2 className="font-medium text-emerald-900">マッチングが成立しました</h2>
          <p className="mt-1 text-sm text-emerald-800">
            担当: {(session.users as { full_name?: string } | null)?.full_name ?? "（不明）"} ／
            予定: {fmtDateTime(session.scheduled_at)} ／ 状態:{" "}
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </p>
          <Link
            href={`/sessions/${session.id}`}
            className="mt-3 inline-block text-sm text-emerald-900 underline"
          >
            セッション画面を開く
          </Link>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">提示中・提示済みの依頼</h2>
        </div>
        {!offers || offers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">まだ誰にも依頼を送っていません。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {offers.map((o) => (
              <li key={o.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>{(o.users as { full_name?: string } | null)?.full_name ?? "（不明）"}</span>
                  <span className="text-xs text-gray-500">
                    {MATCH_OFFER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  提示: {fmtDateTime(o.offered_at)} ／ 返答期限: {fmtDateTime(o.expires_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isSettled ? null : (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">マッチング候補</h2>
            <form action={regenerateCandidates}>
              <input type="hidden" name="requestId" value={request.id} />
              <Button type="submit" variant="outline">
                候補を再検索
              </Button>
            </form>
          </div>

          {usesKeywordMatch ? (
            <p className="mt-2 text-xs text-gray-500">
              ※ AI意味検索が未設定のため、教科・学年の一致で候補を表示しています。
            </p>
          ) : null}

          {candidates.length === 0 ? (
            <div className="mt-3 rounded border border-dashed p-6 text-center">
              <p className="text-sm text-gray-600">
                条件に合うボランティアが見つかりませんでした。
              </p>
              <p className="mt-1 text-xs text-gray-500">
                教科・学年・希望日時の条件を広げると見つかりやすくなります。
              </p>
              <Link
                href="/teacher/requests/new"
                className="mt-3 inline-block text-sm text-gray-900 underline"
              >
                条件を変えて新しく依頼する
              </Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {candidates.map((c) => (
                <li key={c.offerId} className="rounded border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{c.fullName}</span>
                    <span className="text-xs text-gray-500">
                      適合度 {Math.round(c.score * 100)}％ ／ 実績 {c.sessionCount}回 ／ 評価{" "}
                      {c.ratingAvg === null ? "—" : c.ratingAvg.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    教科: {c.subjects.join("、") || "—"} ／ 学年: {c.grades.join("、") || "—"}
                  </p>
                  {c.availability ? (
                    <p className="mt-1 text-xs text-gray-500">対応可能: {c.availability}</p>
                  ) : null}
                  {c.intro ? (
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{c.intro}</p>
                  ) : null}
                  <form action={offerToVolunteer} className="mt-3">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="volunteerId" value={c.volunteerId} />
                    <Button type="submit">この方に依頼する</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
