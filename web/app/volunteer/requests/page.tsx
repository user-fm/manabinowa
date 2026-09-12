import { Badge, toneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { fmtDateTime, MATCH_OFFER_STATUS_LABEL } from "@/lib/labels";
import { offerDisplayStatus } from "@/lib/matching";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptOffer, declineOffer } from "./actions";

const ERROR_MESSAGE: Record<string, string> = {
  responded: "この依頼はすでに返答済みです。",
  expired: "この依頼は返答期限を過ぎています。",
  closed: "この依頼はすでにほかの方で成立しました。",
  db: "処理に失敗しました。時間をおいて再度お試しください。",
};

type OfferRequest = {
  id: string;
  subject: string;
  grade: string;
  detail: string;
  desired_at: string | null;
  schools: { name?: string } | null;
};

type OfferRow = {
  id: string;
  status: string;
  offered_at: string;
  expires_at: string;
  volunteer_requests: OfferRequest | null;
};

export default async function VolunteerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; declined?: string }>;
}) {
  const { error, declined } = await searchParams;
  const profile = await requireRole(["volunteer"]);

  const admin = createAdminClient();
  const { data: offerRows } = await admin
    .from("match_offers")
    .select(
      "id, status, offered_at, expires_at, volunteer_requests(id, subject, grade, detail, desired_at, schools(name))",
    )
    .eq("volunteer_id", profile.id)
    .order("offered_at", { ascending: false })
    .limit(50);

  // D-13: expired への更新は定期実行で入るため、画面では期限を見て振り分ける。
  const offers = ((offerRows ?? []) as unknown as OfferRow[]).map((o) => ({
    ...o,
    displayStatus: offerDisplayStatus(o),
  }));
  const pending = offers.filter((o) => o.displayStatus === "offered");
  const history = offers.filter((o) => o.displayStatus !== "offered");
  const canRespond = profile.accountStatus !== "pending";

  const { data: requests } = await admin
    .from("volunteer_requests")
    .select("id, subject, grade, detail, desired_at, created_at, schools(name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="ボランティア"
        title="学校からの依頼"
        lead="あなたへ届いた依頼と、いま募集中の依頼の一覧です。"
      />

      {profile.accountStatus === "pending" ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          運営の審査待ちです。承認されると依頼を承諾できるようになります。
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {declined ? (
        <p className="mb-4 rounded-md border border-line bg-surface p-4 text-sm font-medium text-muted">
          依頼を辞退しました。学校へお知らせしました。
        </p>
      ) : null}

      <Section title="あなたへの依頼" className="mt-0">
        {pending.length === 0 ? (
          <Card className="mt-3 border-dashed py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon name="inbox" className="size-6" />
            </span>
            <p className="mt-4 text-sm font-bold">返答待ちの依頼はありません</p>
            <p className="mt-2 text-xs font-medium text-muted">
              スキル登録の内容をもとに、学校から依頼が届きます。
            </p>
          </Card>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((o) => (
              <li key={o.id}>
                <Card className="border-brand">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-base font-bold">
                      {o.volunteer_requests?.subject}（{o.volunteer_requests?.grade}）
                    </span>
                    <Badge tone="warn">返答期限: {fmtDateTime(o.expires_at)}</Badge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-muted">
                    {o.volunteer_requests?.schools?.name ?? "—"} ／ 希望日時:{" "}
                    {fmtDateTime(o.volunteer_requests?.desired_at)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7">
                    {o.volunteer_requests?.detail}
                  </p>
                  <div className="mt-5 flex gap-2 border-t border-line pt-5">
                    <form action={acceptOffer}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <Button type="submit" disabled={!canRespond}>
                        承諾する
                      </Button>
                    </form>
                    <form action={declineOffer}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <Button type="submit" variant="outline" disabled={!canRespond}>
                        辞退する
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {history.length > 0 ? (
        <Section title="返答済みの依頼">
          <ul className="mt-3 space-y-2">
            {history.map((o) => (
              <li key={o.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      {o.volunteer_requests?.subject}（{o.volunteer_requests?.grade}）
                    </span>
                    <Badge tone={toneForStatus(o.displayStatus)}>
                      {MATCH_OFFER_STATUS_LABEL[o.displayStatus] ?? o.displayStatus}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted">
                    {o.volunteer_requests?.schools?.name ?? "—"} ／ 提示:{" "}
                    {fmtDateTime(o.offered_at)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="募集中の依頼">
        <p className="mt-2 text-xs font-medium leading-6 text-muted">
          学校が候補を選んで依頼を送ります。スキル登録を充実させると声がかかりやすくなります。
        </p>
        {!requests || requests.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-muted">募集中の依頼はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li key={r.id}>
                <Card>
                  <span className="text-base font-bold">
                    {r.subject}（{r.grade}）
                  </span>
                  <p className="mt-2 text-xs font-medium text-muted">
                    {(r.schools as { name?: string } | null)?.name ?? "—"} ／ 希望日時:{" "}
                    {fmtDateTime(r.desired_at)}
                  </p>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm font-medium leading-7">
                    {r.detail}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}
