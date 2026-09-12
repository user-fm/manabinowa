-- セッション前リマインドの送信済み記録(E-05)
-- 定期処理が同じセッションへ何度もリマインドを送らないようにする。
begin;

alter table volunteer_sessions
  add column if not exists reminder_sent_at timestamptz;

comment on column volunteer_sessions.reminder_sent_at is
  'E-05 リマインドを送信した日時。null の場合は未送信。';

-- 未送信かつ開催予定のものだけを走査する
create index if not exists idx_vsess_reminder_pending
  on volunteer_sessions(scheduled_at) where reminder_sent_at is null;

commit;