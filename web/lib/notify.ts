// D-09 / D-12 のメール通知。将来の J フロー(通知)の共通入口としても使う。
// RESEND_API_KEY が未設定の環境では実送信せず、notification_logs に
// 未送信として記録する(status='failed' + payload.reason)。キー設定後に
// 失敗ログ(idx_nlog_failed)から再送できるようにするため sent 扱いにはしない。

import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationCategory =
  | "matching"
  | "session_reminder"
  | "community"
  | "safety_alert"
  | "message"
  | "consent";

export type NotifyInput = {
  /** 宛先ユーザー(users.id)。ログの紐付けに使う */
  userId: string;
  /** 宛先メールアドレス。未指定なら users.email を引く */
  email?: string | null;
  category: NotificationCategory;
  subject: string;
  /** 本文(プレーンテキスト)。改行はそのまま HTML に反映する */
  body: string;
};

const FROM = process.env.MAIL_FROM ?? "まなびのわ <onboarding@resend.dev>";

/**
 * 本人の通知設定を見て、この種類のメールを送ってよいか判定する。
 * 設定行が無い場合は既定で送る(オプトアウト方式)。判定に失敗した場合も送る側に倒す。
 */
async function wantsNotification(userId: string, category: NotificationCategory) {
  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("notification_prefs")
    .select("email_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefs?.email_enabled === false) return false;

  const { data: row } = await admin
    .from("notification_categories")
    .select("enabled")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();
  return row?.enabled !== false;
}

/**
 * メール通知を送る。送信可否に関わらず notification_logs に記録し、
 * 実送信できた場合のみ true を返す。通知の失敗で業務処理は止めない。
 */
export async function sendEmailNotification(input: NotifyInput): Promise<boolean> {
  const admin = createAdminClient();

  let to = input.email ?? null;
  if (!to) {
    const { data } = await admin.from("users").select("email").eq("id", input.userId).maybeSingle();
    to = data?.email ?? null;
  }

  // 宛先を明示している場合(保護者への同意メールなど)は、利用者本人の設定に依らず送る。
  if (!input.email && !(await wantsNotification(input.userId, input.category))) {
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;
  let status: "sent" | "failed" = "failed";
  let reason: string | null = null;

  if (!to) {
    reason = "宛先メールアドレスが未登録";
  } else if (!apiKey) {
    reason = "RESEND_API_KEY未設定のため未送信";
    console.info("[通知スタブ]", input.subject, "→", to);
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [to],
          subject: input.subject,
          text: input.body,
        }),
      });
      if (res.ok) {
        status = "sent";
      } else {
        reason = `送信APIエラー(${res.status})`;
        console.error("通知送信失敗", res.status, res.statusText);
      }
    } catch (error) {
      reason = "送信APIへの接続失敗";
      console.error("通知送信失敗", error instanceof Error ? error.message : error);
    }
  }

  const { error } = await admin.from("notification_logs").insert({
    user_id: input.userId,
    channel: "email",
    category: input.category,
    status,
    payload: { subject: input.subject, body: input.body, to, reason },
  });
  if (error) console.error("通知ログ記録失敗", error.message);

  return status === "sent";
}
