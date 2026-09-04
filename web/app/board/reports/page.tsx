import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// K-10: 月次監査レポート。所管自治体の直近6か月の活動と安全対応を月ごとにまとめる。
// 個別の事案は各校の管理者までの取り扱いとし、ここでは件数のみを扱う。
const MONTHS = 6;

type MonthBucket = {
  key: string;
  label: string;
  requests: number;
  sessions: number;
  alerts: number;
  blocks: number;
};

/** 直近 MONTHS か月ぶんの入れ物を新しい順で作る */
function buildMonths(): MonthBucket[] {
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      requests: 0,
      sessions: 0,
      alerts: 0,
      blocks: 0,
    };
  });
}

export default async function BoardReportsPage() {
  const profile = await requireRole(["board"]);
  const admin = createAdminClient();

  const { data: schoolRows } = await admin
    .from("schools")
    .select("id")
    .eq("municipality_code", profile.municipalityCode ?? "");
  const schoolIds = (schoolRows ?? []).map((s) => s.id as string);

  const months = buildMonths();
  const oldest = months[months.length - 1];
  const sinceIso = new Date(`${oldest.key}-01T00:00:00Z`).toISOString();

  if (schoolIds.length > 0) {
    const pick = (table: string) =>
      admin.from(table).select("created_at").in("school_id", schoolIds).gte("created_at", sinceIso);

    const [requests, sessions, alerts, blocks] = await Promise.all([
      pick("volunteer_requests"),
      pick("volunteer_sessions"),
      pick("safety_alerts"),
      pick("block_list"),
    ]);

    const tally = (
      rows: { created_at: string }[] | null,
      field: "requests" | "sessions" | "alerts" | "blocks",
    ) => {
      for (const row of rows ?? []) {
        const bucket = months.find((m) => m.key === row.created_at.slice(0, 7));
        if (bucket) bucket[field] += 1;
      }
    };

    tally(requests.data as { created_at: string }[] | null, "requests");
    tally(sessions.data as { created_at: string }[] | null, "sessions");
    tally(alerts.data as { created_at: string }[] | null, "alerts");
    tally(blocks.data as { created_at: string }[] | null, "blocks");
  }

  const total = months.reduce(
    (acc, m) => ({
      requests: acc.requests + m.requests,
      sessions: acc.sessions + m.sessions,
      alerts: acc.alerts + m.alerts,
      blocks: acc.blocks + m.blocks,
    }),
    { requests: 0, sessions: 0, alerts: 0, blocks: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教育委員会"
        title="月次監査レポート"
        lead={`所管する学校の直近${MONTHS}か月の活動状況です。個別の事案は各校の管理者が取り扱います。`}
      />

      {schoolIds.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-sm font-medium text-muted">
          所管する学校がまだ登録されていません。
        </Card>
      ) : (
        <>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-brand-soft/40 text-left text-xs">
                  <th className="px-5 py-4 font-bold">月</th>
                  <th className="px-3 py-4 font-bold">依頼</th>
                  <th className="px-3 py-4 font-bold">指導セッション</th>
                  <th className="px-3 py-4 font-bold">安全アラート</th>
                  <th className="px-5 py-4 font-bold">ブロック申請</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 font-bold">{m.label}</td>
                    <td className="px-3 py-4 font-medium">{m.requests}</td>
                    <td className="px-3 py-4 font-medium">{m.sessions}</td>
                    <td className="px-3 py-4 font-medium">{m.alerts}</td>
                    <td className="px-5 py-4 font-medium">{m.blocks}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-background font-bold">
                  <td className="px-5 py-4">合計</td>
                  <td className="px-3 py-4">{total.requests}</td>
                  <td className="px-3 py-4">{total.sessions}</td>
                  <td className="px-3 py-4">{total.alerts}</td>
                  <td className="px-5 py-4">{total.blocks}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <p className="mt-4 text-xs font-medium leading-6 text-muted">
            ※
            安全アラートは、指導中のやり取りをAIが確認して注意が必要と判断した件数です。内容の確認と対応は各校の管理者が行います。
          </p>
        </>
      )}
    </main>
  );
}
