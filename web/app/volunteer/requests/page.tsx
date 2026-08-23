import { Button } from "@/components/ui/button";
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">学校からの依頼</h1>
      <p className="mt-1 text-sm text-gray-500">
        あなたへ届いた依頼と、いま募集中の依頼の一覧です。
      </p>

      {profile.accountStatus === "pending" ? (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          運営の審査待ちです。承認されると依頼を承諾できるようになります。
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {declined ? (
        <p className="mt-3 rounded border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700">
          依頼を辞退しました。学校へお知らせしました。
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="font-medium">あなたへの依頼</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            返答待ちの依頼はありません。スキル登録の内容をもとに、学校から依頼が届きます。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((o) => (
              <li key={o.id} className="rounded border border-gray-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {o.volunteer_requests?.subject}（{o.volunteer_requests?.grade}）
                  </span>
                  <span className="text-xs text-gray-500">
                    返答期限: {fmtDateTime(o.expires_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {o.volunteer_requests?.schools?.name ?? "—"} ／ 希望日時:{" "}
                  {fmtDateTime(o.volunteer_requests?.desired_at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{o.volunteer_requests?.detail}</p>
                <div className="mt-3 flex gap-2">
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-medium">返答済みの依頼</h2>
          <ul className="mt-3 space-y-2">
            {history.map((o) => (
              <li key={o.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {o.volunteer_requests?.subject}（{o.volunteer_requests?.grade}）
                  </span>
                  <span className="text-xs text-gray-500">
                    {MATCH_OFFER_STATUS_LABEL[o.displayStatus] ?? o.displayStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {o.volunteer_requests?.schools?.name ?? "—"} ／ 提示: {fmtDateTime(o.offered_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-medium">募集中の依頼</h2>
        <p className="mt-1 text-xs text-gray-500">
          学校が候補を選んで依頼を送ります。スキル登録を充実させると声がかかりやすくなります。
        </p>
        {!requests || requests.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">募集中の依頼はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded border p-4">
                <span className="font-medium">
                  {r.subject}（{r.grade}）
                </span>
                <p className="mt-1 text-xs text-gray-500">
                  {(r.schools as { name?: string } | null)?.name ?? "—"} ／ 希望日時:{" "}
                  {fmtDateTime(r.desired_at)}
                </p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{r.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
