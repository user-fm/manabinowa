// H-10 / K-09: 監査ログの記録。
// 設計書 §10.3 により 3 年以上保管する前提のため、記録は消さず追記のみ行う。
// 監査ログの失敗で業務処理を止めないよう、例外は投げずログ出力に留める。

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditActorType = "user" | "operator" | "parent" | "system" | "ai";

export type AuditLogInput = {
  /** 例: "ai_moderation" / "safety_alert_updated" / "block_requested" */
  eventType: string;
  actorType?: AuditActorType;
  /** 操作した人の users.id(システム・AI の場合は省略) */
  actorId?: string | null;
  /** 表示用の主体名。AI監視なら "AI監視" など */
  actorLabel?: string | null;
  sessionId?: string | null;
  /** 対象レコードのID(アラート・メッセージ・ボランティアなど) */
  targetId?: string | null;
  alertLevel?: "low" | "medium" | "high" | "urgent" | null;
  detail?: Record<string, unknown> | null;
};

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    event_type: input.eventType,
    actor_type: input.actorType ?? "system",
    actor_id: input.actorId ?? null,
    actor_label: input.actorLabel ?? null,
    session_id: input.sessionId ?? null,
    target_id: input.targetId ?? null,
    alert_level: input.alertLevel ?? null,
    detail: input.detail ?? null,
  });
  if (error) console.error("監査ログ記録失敗", error.message);
}
