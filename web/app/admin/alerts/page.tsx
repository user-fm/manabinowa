import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import {
  ALERT_LEVEL_LABEL,
  ALERT_STATUS_LABEL,
  fmtDateTime,
  SESSION_STATUS_LABEL,
} from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { acknowledgeAlert, requestBlock, resolveAlert } from "./actions";

// H-08: 管理者アラート画面。AI監視(H-07)が検知した内容と対応操作(H-09)をまとめる。

const ERROR_MESSAGE: Record<string, string> = {
  responded: "このアラートはすでに対応済みです。",
  reason: "ブロック申請には理由の入力が必要です。",
  block_exists: "このボランティアのブロック申請はすでに提出されています。",
  db: "処理に失敗しました。時間をおいて再度お試しください。",
};

const SAVED_MESSAGE: Record<string, string> = {
  acknowledged: "確認済みにしました。",
  resolved: "対応済みにしました。",
  resolved_resumed: "対応済みにしました。一時停止していたセッションを再開しました。",
  resolved_kept:
    "対応済みにしました。未対応のアラートまたはブロック申請があるため、セッションは一時停止のままです。",
  block: "ブロックを申請しました。運営の審査をお待ちください。",
};

type AlertRow = {
  id: string;
  level: string;
  status: string;
  reason: string | null;
  ai_source: string | null;
  paused_from: string | null;
  created_at: string;
  session_id: string;
  volunteer_id: string;
  chat_messages: { body: string; created_at: string } | null;
  users: { full_name: string } | null;
  volunteer_sessions: { status: string } | null;
};

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const profile = await requireRole(["admin"]);

  if (!profile.schoolId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">学校が未設定です。登録をやり直してください。</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("safety_alerts")
    .select(
      "id, level, status, reason, ai_source, paused_from, created_at, session_id, volunteer_id, chat_messages(body, created_at), users!safety_alerts_volunteer_id_fkey(full_name), volunteer_sessions(status)",
    )
    .eq("school_id", profile.schoolId)
    .order("created_at", { ascending: false });

  const alerts = (data ?? []) as unknown as AlertRow[];
  const pending = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">安全アラート</h1>
      <p className="mt-1 text-sm text-gray-500">
        AI監視が検知したセッション内の要確認事項です。内容を確認して対応してください。
      </p>

      {error ? (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {SAVED_MESSAGE[saved] ?? "保存しました。"}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="font-medium">対応が必要なアラート</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">対応が必要なアラートはありません。</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {pending.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-medium">対応済みのアラート</h2>
          <ul className="mt-3 space-y-2">
            {resolved.map((a) => (
              <li key={a.id} className="p-3 text-sm rounded-lg border border-gray-300 bg-white">
                <div className="flex items-center justify-between">
                  <span>
                    {ALERT_LEVEL_LABEL[a.level] ?? a.level}／{a.users?.full_name ?? "（不明）"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {ALERT_STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  検知: {fmtDateTime(a.created_at)} ／ {a.reason ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function AlertCard({ alert }: { alert: AlertRow }) {
  const isUrgent = alert.level === "urgent";
  const sessionStatus = alert.volunteer_sessions?.status;

  return (
    <li className={`rounded border p-4 ${isUrgent ? "border-red-400 bg-red-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-medium ${isUrgent ? "text-red-800" : ""}`}>
          重要度: {ALERT_LEVEL_LABEL[alert.level] ?? alert.level}
        </span>
        <span className="text-xs text-gray-500">
          {ALERT_STATUS_LABEL[alert.status] ?? alert.status} ／ 検知:{" "}
          {fmtDateTime(alert.created_at)}
        </span>
      </div>

      <p className="mt-2 text-sm">
        対象ボランティア: {alert.users?.full_name ?? "（不明）"}
        {sessionStatus
          ? `／ セッション: ${SESSION_STATUS_LABEL[sessionStatus] ?? sessionStatus}`
          : null}
      </p>
      <p className="mt-1 text-sm">検知理由: {alert.reason ?? "—"}</p>
      {alert.ai_source === "keyword" ? (
        <p className="mt-1 text-xs text-gray-500">
          ※ AI解析が未設定のため、禁止語パターンによる検知です。
        </p>
      ) : null}

      {alert.chat_messages ? (
        <blockquote className="mt-3 rounded border-l-4 border-gray-300 bg-white p-3 text-sm">
          <p className="whitespace-pre-wrap">{alert.chat_messages.body}</p>
          <p className="mt-1 text-xs text-gray-500">
            発言: {fmtDateTime(alert.chat_messages.created_at)}
          </p>
        </blockquote>
      ) : null}

      {alert.paused_from ? (
        sessionStatus === "paused" ? (
          <p className="mt-3 text-sm text-red-800">
            緊急のため、該当セッションを一時停止しています。「対応済みにする」を押すと再開します。
          </p>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            緊急のため一時停止しましたが、現在は再開されています。
          </p>
        )
      ) : null}

      <Link
        href={`/sessions/${alert.session_id}`}
        className="mt-3 inline-block text-sm text-gray-900 underline"
      >
        セッションの内容を確認する
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        {alert.status === "open" ? (
          <form action={acknowledgeAlert}>
            <input type="hidden" name="alertId" value={alert.id} />
            <Button type="submit" variant="outline">
              確認済みにする
            </Button>
          </form>
        ) : null}
        <form action={resolveAlert}>
          <input type="hidden" name="alertId" value={alert.id} />
          <Button type="submit">対応済みにする</Button>
        </form>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-700">
          このボランティアのブロックを申請する
        </summary>
        <form action={requestBlock} className="mt-2 space-y-2">
          <input type="hidden" name="alertId" value={alert.id} />
          <Input
            name="reason"
            placeholder="申請の理由（運営の審査に使われます）"
            required
            maxLength={500}
          />
          <p className="text-xs text-gray-500">
            申請すると運営が審査します。承認されるまで自校でのマッチングは通常どおりです。
          </p>
          <Button type="submit" variant="outline">
            ブロックを申請する
          </Button>
        </form>
      </details>
    </li>
  );
}
