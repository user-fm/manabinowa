-- まなびのわ 追加DDL: AI監視アラートの検知理由(Hフロー H-05/H-08)
-- 目的: safety_alerts は level しか持たず、管理者が「何を根拠に上がったアラートか」を
--       画面(H-08)で確認できなかった。判定理由と判定の出所を保持する。
-- ai_source は 'gemini'(AI解析) / 'keyword'(API未設定時のフォールバック検知)。
--       運用中にAI監視が実際に効いているかを確認するために残す。
-- paused_from は H-06a で一時停止したときの停止前の状態。H-09 で対応を完了した際に
--       元の状態へ戻すために持つ(誤検知で止まったまま復旧できない状態を作らない)。

begin;

alter table safety_alerts
  add column if not exists reason      text,
  add column if not exists ai_source   text,
  add column if not exists paused_from session_status;

comment on column safety_alerts.reason is
  'AI監視が検知した理由(管理者向けの日本語説明・H-08で表示)。';
comment on column safety_alerts.ai_source is
  '判定の出所。gemini=AI解析、keyword=禁止語パターンによる代替検知。';
comment on column safety_alerts.paused_from is
  'H-06a でセッションを一時停止したときの停止前の状態。H-09 の対応完了時に戻す先。';

-- 未対応アラートの検知元メッセージを引くための索引(H-08 の一覧表示)
create index if not exists idx_alert_chat_message on safety_alerts(chat_message_id);

commit;
