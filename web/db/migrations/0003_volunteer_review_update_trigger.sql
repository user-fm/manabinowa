-- まなびのわ 追加DDL: ボランティア実績集計を評価の修正にも追随させる
-- 背景: 0000_init.sql の trg_vrev_stats は after insert のみだったため、
--       既存の評価を修正(update)しても users.rating_avg が古いままになる。
--       volunteer_reviews.session_id は unique で、E-16 の評価登録は
--       同一セッションの上書き(upsert)を許す運用のため update も拾う必要がある。
-- 関数 update_volunteer_stats() は new.volunteer_id しか参照しないため変更不要。

begin;

drop trigger if exists trg_vrev_stats on volunteer_reviews;

create trigger trg_vrev_stats after insert or update on volunteer_reviews
  for each row execute function update_volunteer_stats();

commit;
