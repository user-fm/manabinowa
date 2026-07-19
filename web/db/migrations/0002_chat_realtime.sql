-- まなびのわ 追加DDL: セッション内チャットのリアルタイム配信
-- 目的: Eフロー E-10(chat_messages 送受信)で、参加者のブラウザへ新着を即時配信する。
--       Supabase Realtime は publication に載ったテーブルの変更のみを流すため、
--       chat_messages を supabase_realtime publication に追加する。
-- 注: 配信内容にも RLS(chat_select = is_session_participant)が適用されるため、
--     セッション参加者以外には届かない。

begin;

-- 既に追加済みの環境で二重登録にならないようにする
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end;
$$;

commit;
