import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Card className="border-red-300 bg-red-50 text-sm font-bold text-red-700">
          学校が未設定です。登録をやり直してください。
        </Card>
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <PageHeader
        eyebrow="学校管理者"
        title="安全アラート"
        lead="AI監視が検知したセッション内の要確認事項です。内容を確認して対応してください。"
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
          {ERROR_MESSAGE[error] ?? "処理に失敗しました。"}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-4 rounded-md border border-brand/40 bg-brand-soft p-4 text-sm font-bold text-brand-dark">
          {SAVED_MESSAGE[saved] ?? "保存しました。"}
        </p>
      ) : null}

      <Section title="対応が必要なアラート" className="mt-0">
        {pending.length === 0 ? (
          <Card className="mt-3 border-dashed py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon name="shield" className="size-6" />
            </span>
            <p className="mt-4 text-sm font-bold">対応が必要なアラートはありません</p>
            <p className="mt-2 text-xs font-medium text-muted">
              セッション中のやり取りは、引き続きAIが確認しています。
            </p>
          </Card>
        ) : (
          <ul className="mt-3 space-y-4">
            {pending.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </Section>

      {resolved.length > 0 ? (
        <Section title="対応済みのアラート">
          <ul className="mt-3 space-y-2">
            {resolved.map((a) => (
              <li key={a.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      {ALERT_LEVEL_LABEL[a.level] ?? a.level}／{a.users?.full_name ?? "（不明）"}
                    </span>
                    <Badge tone="done">{ALERT_STATUS_LABEL[a.status] ?? a.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted">
                    検知: {fmtDateTime(a.created_at)} ／ {a.reason ?? "—"}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </main>
  );
}

function AlertCard({ alert }: { alert: AlertRow }) {
  const isUrgent = alert.level === "urgent";
  const sessionStatus = alert.volunteer_sessions?.status;

  return (
    <li>
      <Card className={isUrgent ? "border-red-400 bg-red-50" : ""}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span
              className={`flex size-9 items-center justify-center rounded-full ${
                isUrgent ? "bg-red-600 text-white" : "bg-brand-soft text-brand"
              }`}
            >
              <Icon name="shield" className="size-5" />
            </span>
            <span className={`font-bold ${isUrgent ? "text-red-800" : ""}`}>
              重要度: {ALERT_LEVEL_LABEL[alert.level] ?? alert.level}
            </span>
          </span>
          <Badge tone={isUrgent ? "danger" : toneForStatus(alert.status)}>
            {ALERT_STATUS_LABEL[alert.status] ?? alert.status}
          </Badge>
        </div>

        <dl className="mt-4 space-y-1 text-sm font-medium">
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">検知日時</dt>
            <dd>{fmtDateTime(alert.created_at)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">対象</dt>
            <dd>
              {alert.users?.full_name ?? "（不明）"}
              {sessionStatus
                ? ` ／ セッション: ${SESSION_STATUS_LABEL[sessionStatus] ?? sessionStatus}`
                : null}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">理由</dt>
            <dd>{alert.reason ?? "—"}</dd>
          </div>
        </dl>

        {alert.ai_source === "keyword" ? (
          <p className="mt-2 text-xs font-medium text-muted">
            ※ AI解析が未設定のため、禁止語パターンによる検知です。
          </p>
        ) : null}

        {alert.chat_messages ? (
          <blockquote className="mt-4 rounded-md border border-line border-l-4 border-l-brand bg-surface p-4 text-sm">
            <p className="whitespace-pre-wrap font-medium leading-7">{alert.chat_messages.body}</p>
            <p className="mt-2 text-xs font-medium text-muted">
              発言: {fmtDateTime(alert.chat_messages.created_at)}
            </p>
          </blockquote>
        ) : null}

        {alert.paused_from ? (
          sessionStatus === "paused" ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm font-bold leading-6 text-red-800">
              緊急のため、該当セッションを一時停止しています。「対応済みにする」を押すと再開します。
            </p>
          ) : (
            <p className="mt-4 text-sm font-medium text-muted">
              緊急のため一時停止しましたが、現在は再開されています。
            </p>
          )
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
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
          <Link href={`/sessions/${alert.session_id}`}>
            <Button variant="quiet">セッションの内容を確認する</Button>
          </Link>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-muted hover:text-brand-dark">
            このボランティアのブロックを申請する
          </summary>
          <form action={requestBlock} className="mt-3 space-y-3">
            <input type="hidden" name="alertId" value={alert.id} />
            <Input
              name="reason"
              placeholder="申請の理由（運営の審査に使われます）"
              required
              maxLength={500}
            />
            <p className="text-xs font-medium leading-6 text-muted">
              申請すると運営が審査します。承認されるまで自校でのマッチングは通常どおりです。
            </p>
            <Button type="submit" variant="outline">
              ブロックを申請する
            </Button>
          </form>
        </details>
      </Card>
    </li>
  );
}
