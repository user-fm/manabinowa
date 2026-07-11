import { requireRole } from "@/lib/auth";
import { ALERT_LEVEL_LABEL, ALERT_STATUS_LABEL, fmtDateTime } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminAlertsPage() {
  const profile = await requireRole(["admin"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: alerts } = await admin
    .from("safety_alerts")
    .select("id, level, status, created_at, session_id")
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">安全アラート</h1>
      <p className="mt-1 text-sm text-gray-500">
        AI監視が検知したセッション内の要確認事項です。対応操作は準備中です。
      </p>

      {!alerts || alerts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">アラートはありません。</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">重要度: {ALERT_LEVEL_LABEL[a.level] ?? a.level}</span>
                <span className="text-xs text-gray-500">
                  {ALERT_STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">検知: {fmtDateTime(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
