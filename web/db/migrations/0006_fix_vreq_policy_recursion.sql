-- まなびのわ 追加DDL: volunteer_requests / match_offers の RLS 相互再帰の解消
-- 背景: 0000_init.sql の2つのポリシーが互いのテーブルを参照しており、
--       教師が依頼を作成すると Postgres が無限再帰を検出して失敗する。
--         infinite recursion detected in policy for relation "volunteer_requests"
--
--       ・vreq_vol_select (volunteer_requests の SELECT) が match_offers を参照
--         → ボランティアが自分宛の依頼だけを見られるようにするため
--       ・moff_teacher_select (match_offers の SELECT) が volunteer_requests を参照
--         → 教師が自分の依頼の提示状況を見られるようにするため
--
--       同ファイルの is_session_participant() と同じ方針で、片側の参照を
--       security definer 関数に逃がしてポリシー評価の連鎖を切る。
--       ポリシーの意図(可視範囲)は変更しない。

begin;

-- ボランティア本人に対する提示が存在するかを、RLS を経由せずに判定する。
-- security definer で match_offers を直接読むため、match_offers 側の
-- ポリシー(=volunteer_requests を参照する)が評価されず再帰しない。
create or replace function public.has_offer_for_request(rid uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from match_offers
    where request_id = rid and volunteer_id = auth.uid()
  )
$$;

comment on function public.has_offer_for_request is
  'ボランティア本人宛の提示が当該依頼に存在するか。vreq_vol_select の再帰回避用。';

drop policy if exists vreq_vol_select on volunteer_requests;
create policy vreq_vol_select on volunteer_requests for select to authenticated
  using (has_offer_for_request(id));

-- 関数経由でのみ使う想定のため、直接実行は絞る。
revoke all on function public.has_offer_for_request(uuid) from public;
grant execute on function public.has_offer_for_request(uuid) to authenticated, service_role;

commit;
