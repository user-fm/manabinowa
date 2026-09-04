import type { Role } from "@/lib/auth";

// 画面表示用の日本語ラベル(DB の enum 値 → 表示名)

export const ROLE_LABEL: Record<Role, string> = {
  teacher: "教師",
  student: "生徒",
  volunteer: "ボランティア",
  community: "地域住民・団体",
  admin: "学校管理者",
  board: "教育委員会",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "募集中",
  matching: "調整中",
  matched: "成立",
  closed: "終了",
  expired: "期限切れ",
};

export const MATCH_OFFER_STATUS_LABEL: Record<string, string> = {
  offered: "返答待ち",
  accepted: "承諾",
  declined: "辞退",
  expired: "期限切れ",
};

export const COMMUNITY_STATUS_LABEL: Record<string, string> = {
  pending: "確認待ち",
  accepted: "受入",
  rejected: "見送り",
};

export const COMMUNITY_CATEGORY_LABEL: Record<string, string> = {
  poster: "ポスター・制作",
  event: "行事・イベント",
  lecturer: "講師・出前授業",
  other: "その他",
};

export const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  paused: "中断",
  completed: "完了",
  cancelled: "中止",
};

export const ALERT_LEVEL_LABEL: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const ALERT_STATUS_LABEL: Record<string, string> = {
  open: "未対応",
  acknowledged: "確認済み",
  resolved: "対応済み",
};

export const BLOCK_STATUS_LABEL: Record<string, string> = {
  pending: "審査中",
  approved: "承認",
  rejected: "却下",
};

export const INQUIRY_CATEGORY_LABEL: Record<string, string> = {
  bug: "不具合の報告",
  usage: "使い方について",
  unblock: "ブロック解除の相談",
  consent: "同意手続きについて",
  deletion: "データ削除の依頼",
  other: "その他",
};

/** 通知の種類(notification_category)。設定画面での並び順もこの順に従う。 */
export const NOTIFICATION_CATEGORIES = [
  "matching",
  "session_reminder",
  "community",
  "safety_alert",
  "message",
  "consent",
] as const;

export const NOTIFICATION_CATEGORY_LABEL: Record<string, { label: string; desc: string }> = {
  matching: { label: "マッチング", desc: "依頼の提示や、承諾・辞退のお知らせ" },
  session_reminder: { label: "セッションの予定", desc: "指導の前日リマインド" },
  community: { label: "地域連携", desc: "地域からの申し出や、その受入結果" },
  safety_alert: { label: "安全アラート", desc: "AI監視が検知した内容のお知らせ" },
  message: { label: "メッセージ", desc: "他の利用者からのメッセージ" },
  consent: { label: "保護者同意", desc: "同意のお願いと、その完了通知" },
};

/** 日時表示。null は「—」 */
export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

/** 日付のみ。null は「—」 */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ja-JP", { dateStyle: "medium" });
}
