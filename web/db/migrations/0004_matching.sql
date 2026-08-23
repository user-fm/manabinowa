-- まなびのわ 追加DDL: ボランティアマッチング(Dフロー D-07/D-08/D-13)
-- 目的:
--   1. is_offerable_volunteer()     … その依頼にその人を提示してよいかを判定する(D-10/D-11)。
--      候補検索と提示(insert)の両方から呼び、除外条件の定義を1か所に集約する。
--   2. match_volunteer_candidates() … pgvector 類似検索でボランティア候補を返す(D-07)。
--      埋め込み未生成の環境では教科・学年の条件一致にフォールバックする。
--   3. expire_match_offers()        … 承諾期限(48時間)を過ぎた提示を expired にする(D-13)。
-- 注: volunteer_offers は RLS で本人しか読めないため、教師が候補を見るには
--     security definer が必要。関数内で「依頼の担当教師本人か、service_role か」を検証する。

begin;

-- 期限切れ判定の走査を軽くする(未応答の提示だけを見る)
create index if not exists idx_moff_pending_expiry
  on match_offers(expires_at) where status = 'offered';

-- ---------------------------------------------------------------------
-- D-10/D-11: 提示可否の判定
--   候補検索で除外している条件(ブロック中・未承認・非アクティブ・提示済み)は、
--   提示の書き込み経路でも同じように効かせる必要がある。フォームから来る
--   volunteer_id は信頼できないため、insert 前にこの関数で検証する。
-- ---------------------------------------------------------------------
create or replace function public.is_offerable_volunteer(
  p_request_id   uuid,
  p_volunteer_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from volunteer_requests r
    join volunteer_offers vo
      on vo.volunteer_id = p_volunteer_id
     and vo.is_active
    join users u
      on u.id = vo.volunteer_id
    where r.id = p_request_id
      and u.role = 'volunteer'
      and u.account_status in ('approved', 'active')
      -- 呼び出し元の検証: 依頼の担当教師本人、または service_role(auth.uid() が null)
      and (auth.uid() is null or auth.uid() = r.teacher_id)
      -- 当該校でブロック中のボランティアは提示できない
      and not exists (
        select 1 from block_list bl
        where bl.volunteer_id = vo.volunteer_id
          and bl.school_id = r.school_id
          and bl.status = 'approved'
      )
      -- 同じ依頼で既に提示済み(承諾/辞退/期限切れ含む)は再提示しない
      and not exists (
        select 1 from match_offers mo
        where mo.request_id = r.id
          and mo.volunteer_id = vo.volunteer_id
      )
  )
$$;

comment on function public.is_offerable_volunteer is
  'D-10/D-11 提示可否の判定。候補検索と提示の両方から呼ぶ除外条件の唯一の定義。';

-- ---------------------------------------------------------------------
-- D-07: 候補検索
--   p_embedding が null(埋め込み未生成/AI未設定)のときは教科・学年一致で代替する。
--   スコアは 0〜1 で、ベクトル時はコサイン類似度、条件一致時は
--   教科0.5 + 学年0.3 + 評価0.2 の加重で近い意味合いに揃える。
-- ---------------------------------------------------------------------
create or replace function public.match_volunteer_candidates(
  p_request_id uuid,
  p_embedding  vector(768) default null,
  p_threshold  float default 0.75,
  p_limit      int default 10
)
returns table (
  volunteer_id  uuid,
  offer_id      uuid,
  full_name     text,
  subjects      text[],
  grades        text[],
  availability  text,
  intro         text,
  rating_avg    numeric,
  session_count int,
  score         float,
  match_type    text
)
language sql stable security definer set search_path = public, pg_temp as $$
  with req as (
    select id, school_id, teacher_id, subject, grade
    from volunteer_requests
    where id = p_request_id
  ),
  base as (
    select
      vo.id           as offer_id,
      vo.volunteer_id as volunteer_id,
      vo.subjects     as subjects,
      vo.grades       as grades,
      vo.availability as availability,
      vo.intro        as intro,
      vo.embedding    as embedding,
      u.full_name     as full_name,
      u.rating_avg    as rating_avg,
      u.session_count as session_count,
      r.subject       as req_subject,
      r.grade         as req_grade
    from volunteer_offers vo
    join users u on u.id = vo.volunteer_id
    cross join req r
    -- 除外条件(ブロック中・未承認・非アクティブ・提示済み)と呼び出し元の検証は
    -- is_offerable_volunteer() に集約する。提示経路と判定がずれないようにするため。
    where vo.is_active
      and is_offerable_volunteer(r.id, vo.volunteer_id)
  ),
  scored as (
    select
      b.*,
      case
        when p_embedding is not null and b.embedding is not null
          then 1 - (b.embedding <=> p_embedding)
        else
          (case when b.subjects @> array[b.req_subject] then 0.5 else 0 end)
          + (case when b.grades @> array[b.req_grade] then 0.3 else 0 end)
          + least(coalesce(b.rating_avg, 0)::float / 5 * 0.2, 0.2)
      end as score,
      case
        when p_embedding is not null and b.embedding is not null then 'vector'
        else 'keyword'
      end as match_type
    from base b
  )
  select
    s.volunteer_id,
    s.offer_id,
    s.full_name,
    s.subjects,
    s.grades,
    s.availability,
    s.intro,
    s.rating_avg,
    s.session_count,
    s.score,
    s.match_type
  from scored s
  where case
          when s.match_type = 'vector' then s.score >= p_threshold
          -- 条件一致は教科か学年のどちらかが合致していれば候補に含める
          else s.subjects @> array[s.req_subject] or s.grades @> array[s.req_grade]
        end
  order by s.score desc, s.rating_avg desc nulls last, s.session_count desc
  limit p_limit
$$;

comment on function public.match_volunteer_candidates is
  'D-07 マッチング候補検索。p_embedding が null のときは教科・学年の条件一致で代替する。';

-- ---------------------------------------------------------------------
-- D-13: 承諾期限(48時間)切れの提示を expired にする。
--   画面表示から呼ぶと無関係な行まで更新してしまうため、定期実行から呼ぶ。
--   アプリからは POST /api/cron/expire-offers 経由。pg_cron が使える環境なら
--   次のように直接スケジュールしてもよい。
--     select cron.schedule('expire-match-offers', '*/15 * * * *',
--                          $cron$select public.expire_match_offers()$cron$);
-- ---------------------------------------------------------------------
create or replace function public.expire_match_offers()
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  affected integer;
begin
  update match_offers
     set status = 'expired',
         responded_at = coalesce(responded_at, now())
   where status = 'offered'
     and expires_at < now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.expire_match_offers is
  'D-13 承諾期限を過ぎた match_offers を expired にする。戻り値は更新件数。';

revoke all on function public.is_offerable_volunteer(uuid, uuid) from public;
revoke all on function public.match_volunteer_candidates(uuid, vector, float, int) from public;
revoke all on function public.expire_match_offers() from public;
grant execute on function public.is_offerable_volunteer(uuid, uuid) to authenticated, service_role;
grant execute on function public.match_volunteer_candidates(uuid, vector, float, int)
  to authenticated, service_role;
grant execute on function public.expire_match_offers() to authenticated, service_role;

commit;
