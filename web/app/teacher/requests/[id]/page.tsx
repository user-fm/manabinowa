import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import {
  fmtDateTime,
  MATCH_OFFER_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { findCandidates, offerDisplayStatus } from "@/lib/matching";
import { createAdminClient } from "@/lib/supabase/admin";
import { offerToVolunteer, regenerateCandidates } from "./actions";

const ERROR_MESSAGE: Record<string, string> = {
  offer: "依頼の送信に失敗しました。時間をおいて再度お試しください。",
  closed: "この依頼はすでに成立・終了しているため、追加の依頼は送れません。",
  not_offerable:
    "この方には現在依頼を送れません（すでに提示済み、または受け入れ条件を満たしていません）。候補を再検索してください。",
};

const NOTICE_MESSAGE: Record<string, string> = {
  offered: "ボランティアへ依頼を送りました。48時間以内の返答をお待ちください。",
  refreshed: "候補を検索し直しました。",
};

/**
 * D-10: 条件一致で出した候補について、何が合っているかを示す。
 * ベクトル検索の類似度と加重スコアは別物のため、％では並べない。
 */
function matchedConditions(
  candidate: { subjects: string[]; grades: string[] },
  request: { subject: string; grade: string },
): string[] {
  return [
    candidate.subjects.includes(request.subject) ? "教科が一致" : null,
    candidate.grades.includes(request.grade) ? "学年が一致" : null,
  ].filter((v): v is string => v !== null);
}

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教師"
        title={`${request.subject}（${request.grade}）`}
        lead={`状態: ${REQUEST_STATUS_LABEL[request.status] ?? request.status} ／ 希望日時: ${fmtDateTime(request.desired_at)} ／ 作成: ${fmtDateTime(request.created_at)}`}
        back={{ href: "/teacher/requests", label: "依頼の状況へ戻る" }}
      />

      {error ? (
        <p className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-6 rounded-md border border-brand/40 bg-brand-soft p-4 text-sm font-bold text-brand-dark">
          {notice}
        </p>
      ) : null}

      <Card>
        <h2 className="text-xs font-bold text-muted">依頼内容</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7">{request.detail}</p>
      </Card>

      {session ? (
        <Card className="mt-4 border-brand/40 bg-brand-soft">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
              <Icon name="check" className="size-4" />
            </span>
            <h2 className="font-bold text-brand-dark">マッチングが成立しました</h2>
          </div>
          <p className="mt-3 text-sm font-medium text-brand-dark">
            担当: {(session.users as { full_name?: string } | null)?.full_name ?? "（不明）"} ／
            予定: {fmtDateTime(session.scheduled_at)} ／ 状態:{" "}
            {SESSION_STATUS_LABEL[session.status] ?? session.status}
          </p>
          <Link href={`/sessions/${session.id}`} className="mt-4 inline-block">
            <Button>セッション画面を開く</Button>
          </Link>
        </Card>
      ) : null}

      <Section title="提示中・提示済みの依頼">
        {!offers || offers.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-muted">まだ誰にも依頼を送っていません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {offers.map((o) => (
              <li key={o.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      {(o.users as { full_name?: string } | null)?.full_name ?? "（不明）"}
                    </span>
                    <Badge tone={toneForStatus(offerDisplayStatus(o))}>
                      {MATCH_OFFER_STATUS_LABEL[offerDisplayStatus(o)] ?? offerDisplayStatus(o)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted">
                    提示: {fmtDateTime(o.offered_at)} ／ 返答期限: {fmtDateTime(o.expires_at)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {isSettled ? null : (
        <Section
          title="マッチング候補"
          action={
            <form action={regenerateCandidates}>
              <input type="hidden" name="requestId" value={request.id} />
              <Button type="submit" variant="outline">
                候補を再検索
              </Button>
            </form>
          }
        >
          {usesKeywordMatch ? (
            <p className="mt-3 text-xs font-medium leading-6 text-muted">
              ※ AI意味検索が未設定のため、教科・学年の一致で候補を表示しています。
              この場合は適合度ではなく、一致した条件を表示します。
            </p>
          ) : null}

          {candidates.length === 0 ? (
            <Card className="mt-3 border-dashed py-12 text-center">
              <p className="text-sm font-bold">条件に合うボランティアが見つかりませんでした</p>
              <p className="mt-2 text-xs font-medium text-muted">
                教科・学年・希望日時の条件を広げると見つかりやすくなります。
              </p>
              <Link href="/teacher/requests/new" className="mt-6 inline-block">
                <Button variant="outline">条件を変えて新しく依頼する</Button>
              </Link>
            </Card>
          ) : (
            <ul className="mt-3 space-y-3">
              {candidates.map((c) => (
                <li key={c.offerId}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <Icon name="user" className="size-5" />
                        </span>
                        <span className="text-base font-bold">{c.fullName}</span>
                      </span>
                      {/* 適合度(類似度)は AI意味検索のときだけ出す。
                          条件一致のスコアは意味が違うため、一致した条件で示す。 */}
                      {c.matchType === "vector" ? (
                        <Badge tone="brand">適合度 {Math.round(c.score * 100)}％</Badge>
                      ) : null}
                    </div>

                    <p className="mt-3 text-xs font-medium text-muted">
                      実績 {c.sessionCount}回 ／ 評価{" "}
                      {c.ratingAvg === null ? "—" : c.ratingAvg.toFixed(1)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">
                      教科: {c.subjects.join("、") || "—"} ／ 学年: {c.grades.join("、") || "—"}
                    </p>
                    {c.availability ? (
                      <p className="mt-1 text-xs font-medium text-muted">
                        対応可能: {c.availability}
                      </p>
                    ) : null}

                    {c.matchType === "keyword" && matchedConditions(c, request).length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {matchedConditions(c, request).map((label) => (
                          <li key={label}>
                            <Badge tone="brand">{label}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {c.intro ? (
                      <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-7">
                        {c.intro}
                      </p>
                    ) : null}

                    <form action={offerToVolunteer} className="mt-5 border-t border-line pt-5">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="volunteerId" value={c.volunteerId} />
                      <Button type="submit">この方に依頼する</Button>
                    </form>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </main>
  );
}
