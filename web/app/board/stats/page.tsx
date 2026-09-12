import { Card, Section } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 教育委員会の統計ダッシュボード。所管自治体の学校に紐づく数字だけを集計する。
export default async function BoardStatsPage() {
  const profile = await requireRole(["board"]);
  const admin = createAdminClient();

  const { data: schoolRows } = await admin
    .from("schools")
    .select("id, name")
    .eq("municipality_code", profile.municipalityCode ?? "")
    .order("name");
  const schools = (schoolRows ?? []) as { id: string; name: string }[];
  const schoolIds = schools.map((s) => s.id);

  if (schoolIds.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <PageHeader eyebrow="教育委員会" title="統計ダッシュボード" />
        <Card className="border-dashed py-12 text-center text-sm font-medium text-muted">
          所管する学校がまだ登録されていません。
        </Card>
      </main>
    );
  }

  const head = { count: "exact" as const, head: true };
  const [requests, matched, sessions, completed, alerts, blocks] = await Promise.all([
    admin.from("volunteer_requests").select("id", head).in("school_id", schoolIds),
    admin
      .from("volunteer_requests")
      .select("id", head)
      .in("school_id", schoolIds)
      .eq("status", "matched"),
    admin.from("volunteer_sessions").select("id", head).in("school_id", schoolIds),
    admin
      .from("volunteer_sessions")
      .select("id", head)
      .in("school_id", schoolIds)
      .eq("status", "completed"),
    admin.from("safety_alerts").select("id", head).in("school_id", schoolIds).eq("status", "open"),
    admin.from("block_list").select("id", head).in("school_id", schoolIds),
  ]);

  const requestCount = requests.count ?? 0;
  const matchedCount = matched.count ?? 0;
  const matchRate = requestCount > 0 ? Math.round((matchedCount / requestCount) * 100) : null;

  const stats = [
    { label: "参加校", value: schools.length, unit: "校" },
    { label: "依頼の総数", value: requestCount, unit: "件" },
    { label: "マッチング成立", value: matchedCount, unit: "件" },
    { label: "成立率", value: matchRate, unit: "％" },
    { label: "指導セッション", value: sessions.count ?? 0, unit: "回" },
    { label: "実施済み", value: completed.count ?? 0, unit: "回" },
    { label: "未対応のアラート", value: alerts.count ?? 0, unit: "件" },
    { label: "ブロック申請", value: blocks.count ?? 0, unit: "件" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="教育委員会"
        title="統計ダッシュボード"
        lead="所管する学校の利用状況をまとめて確認できます。"
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Card className="h-full p-4">
              <p className="text-xs font-bold text-muted">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold text-brand-dark">
                {stat.value === null ? "—" : stat.value}
                <span className="ml-1 text-xs font-bold text-muted">{stat.unit}</span>
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <Section title="所管する学校">
        <ul className="mt-3 space-y-2">
          {schools.map((school) => (
            <li key={school.id}>
              <Card className="py-4 text-sm font-bold">{school.name}</Card>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
