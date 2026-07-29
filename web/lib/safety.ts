// Hフロー(AI監視)の本体。E-10 のチャット送信から並列起動される(E-11 → H-01)。
// H-02 新メッセージ取得 → H-03/H-04/H-05 解析・判定 → H-06 緊急度分岐 →
// H-06a セッション一時停止 → H-07 管理者・教委へアラート → H-10 監査ログ記録。
// リアルタイム配信を阻害しないため、呼び出し側は応答後に実行する。

import { recordAuditLog } from "@/lib/audit";
import { analyzeMessage, type ConversationTurn, type ModerationResult } from "@/lib/moderation";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** 文脈解析に渡す直近メッセージの件数 */
const CONTEXT_SIZE = 10;
/**
 * 一括検査(API Route)で一度に処理する上限。
 * 1件ごとに Gemini を直列で呼ぶため、API Route の maxDuration(60秒)に
 * 収まる件数にしている。残りは次回の定期実行で処理する。
 */
const BATCH_SIZE = 10;
/** 一括検査を打ち切る経過時間。maxDuration に対して余裕を持たせる。 */
const BATCH_TIME_BUDGET_MS = 45_000;

export type BatchModerationResult = {
  /** 検査できた件数 */
  checked: number;
  /** 時間切れで打ち切ったか(true なら未検査が残っている) */
  timedOut: boolean;
};

type MessageRow = {
  id: number;
  session_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  ai_checked: boolean;
};

/**
 * H-02〜H-10: 1件のチャットメッセージを検査する。
 * 検査済み・存在しない場合は何もしない(二重処理の防止)。
 */
export async function moderateChatMessage(messageId: number): Promise<ModerationResult | null> {
  const admin = createAdminClient();

  const { data: message } = await admin
    .from("chat_messages")
    .select("id, session_id, sender_id, body, created_at, ai_checked")
    .eq("id", messageId)
    .maybeSingle();
  if (!message) return null;

  const target = message as MessageRow;
  if (target.ai_checked) return null;

  // H-03: 直近の会話を文脈として渡す
  const context = await loadContext(target);
  const result = await analyzeMessage(target.body, context);
  const level = result.flagged ? result.level : null;

  // 検査済みとして記録する。判定に失敗しても未検査のまま残さない。
  const { error: updateError } = await admin
    .from("chat_messages")
    .update({ ai_checked: true, ai_risk_level: level })
    .eq("id", target.id);
  if (updateError) console.error("メッセージの検査状態更新失敗", updateError.message);

  const { data: session } = await admin
    .from("volunteer_sessions")
    .select("id, school_id, volunteer_id, status")
    .eq("id", target.session_id)
    .maybeSingle();

  let alertId: string | null = null;

  // H-04/H-06: 兆候ありかつ「低」を超える場合にアラートを立てる(低は記録のみ)。
  if (result.flagged && level && level !== "low" && session) {
    // H-06a: 緊急は即時にセッションを止める(進行中・予定のもののみ)。
    // 停止前の状態は paused_from に残し、H-09 の対応完了時に戻せるようにする。
    let pausedFrom: string | null = null;
    if (
      level === "urgent" &&
      (session.status === "in_progress" || session.status === "scheduled")
    ) {
      const { data: paused, error: pauseError } = await admin
        .from("volunteer_sessions")
        .update({ status: "paused" })
        .eq("id", session.id)
        .in("status", ["in_progress", "scheduled"])
        .select("id")
        .maybeSingle();
      if (pauseError) console.error("セッション一時停止失敗", pauseError.message);
      if (paused) pausedFrom = session.status;
    }

    // H-07: アラート登録
    const { data: alert, error: alertError } = await admin
      .from("safety_alerts")
      .insert({
        session_id: session.id,
        chat_message_id: target.id,
        volunteer_id: session.volunteer_id,
        school_id: session.school_id,
        level,
        status: "open",
        reason: result.reason,
        ai_source: result.source,
        paused_from: pausedFrom,
      })
      .select("id")
      .single();
    if (alertError) {
      console.error("安全アラート登録失敗", alertError.message);
    } else {
      alertId = alert.id;
      await notifySupervisors({
        schoolId: session.school_id,
        sessionId: session.id,
        level,
        reason: result.reason,
        paused: pausedFrom !== null,
      });
    }
  }

  // H-10: 判定の有無にかかわらず全件を監査ログに残す
  await recordAuditLog({
    eventType: "ai_moderation",
    actorType: "ai",
    actorLabel: "AI監視",
    sessionId: target.session_id,
    targetId: alertId,
    alertLevel: level,
    detail: {
      message_id: target.id,
      sender_id: target.sender_id,
      flagged: result.flagged,
      reason: result.reason,
      source: result.source,
    },
  });

  return result;
}

/**
 * H-02: 未検査のメッセージをまとめて検査する(取りこぼしの回収)。
 * 解析は1件ずつ外部APIを呼ぶため、実行時間の上限を超える前に打ち切る。
 * 打ち切った分は未検査のまま残るので、次回の定期実行で処理される。
 */
export async function moderatePendingMessages(
  limit: number = BATCH_SIZE,
): Promise<BatchModerationResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select("id")
    .eq("ai_checked", false)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("未検査メッセージの取得失敗", error.message);
    return { checked: 0, timedOut: false };
  }

  const startedAt = Date.now();
  const rows = data ?? [];
  let checked = 0;
  for (const [index, row] of rows.entries()) {
    // 解析APIの負荷を避けるため直列に処理する
    const result = await moderateChatMessage(row.id as number);
    if (result) checked += 1;
    if (Date.now() - startedAt > BATCH_TIME_BUDGET_MS && index < rows.length - 1) {
      console.warn("一括検査を時間内で打ち切りました", {
        checked,
        remaining: rows.length - index - 1,
      });
      return { checked, timedOut: true };
    }
  }
  return { checked, timedOut: false };
}

/** 直近の会話(発言者名つき)を取得する */
async function loadContext(target: MessageRow): Promise<ConversationTurn[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("chat_messages")
    .select("sender_id, body, created_at")
    .eq("session_id", target.session_id)
    .lt("created_at", target.created_at)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_SIZE);

  const history = (rows ?? []).reverse();
  const senderIds = Array.from(
    new Set(history.map((r) => r.sender_id).filter((v): v is string => Boolean(v))),
  );
  if (senderIds.length === 0) {
    return history.map((r) => ({ speaker: "参加者", body: r.body as string }));
  }

  const { data: users } = await admin.from("users").select("id, full_name").in("id", senderIds);
  const names = Object.fromEntries(
    (users ?? []).map((u) => [u.id as string, u.full_name as string]),
  );
  return history.map((r) => ({
    speaker: (r.sender_id && names[r.sender_id]) || "参加者",
    body: r.body as string,
  }));
}

/**
 * H-07: 学校管理者と、その学校の自治体の教育委員会へ通知する。
 * 通知の失敗でアラート自体は残るため、業務処理は止めない。
 */
async function notifySupervisors(input: {
  schoolId: string;
  sessionId: string;
  level: string;
  reason: string;
  paused: boolean;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: school } = await admin
    .from("schools")
    .select("name, municipality_code")
    .eq("id", input.schoolId)
    .maybeSingle();

  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("school_id", input.schoolId);

  const boards = school?.municipality_code
    ? await admin
        .from("users")
        .select("id")
        .eq("role", "board")
        .eq("municipality_code", school.municipality_code)
    : { data: [] };

  const recipients = [...(admins ?? []), ...(boards.data ?? [])].map((u) => u.id as string);
  if (recipients.length === 0) {
    console.warn("安全アラートの通知先が見つかりません", input.schoolId);
    return;
  }

  const subject =
    input.level === "urgent"
      ? "【まなびのわ】緊急: セッションを一時停止しました"
      : "【まなびのわ】セッションで要確認の発言を検知しました";

  const body = [
    `${school?.name ?? "学校"}のオンライン指導で、AI監視が要確認の発言を検知しました。`,
    "",
    `重要度: ${LEVEL_TEXT[input.level] ?? input.level}`,
    `検知理由: ${input.reason}`,
    input.paused
      ? "緊急のため、該当セッションを一時停止しました。対応済みにすると再開します。"
      : "",
    "",
    "「安全アラート」画面から内容を確認し、対応をお願いします。",
  ]
    .filter(Boolean)
    .join("\n");

  for (const userId of recipients) {
    await sendEmailNotification({ userId, category: "safety_alert", subject, body });
  }
}

const LEVEL_TEXT: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};
