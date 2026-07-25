-- まなびのわ 追加DDL: ボランティアマッチング(Dフロー D-07/D-08/D-13)
-- 目的:
--   1. match_volunteer_candidates() … pgvector 類似検索でボランティア候補を返す(D-07)。
--      埋め込み未生成の環境では教科・学年の条件一致にフォールバックする。
--   2. expire_match_offers()        … 承諾期限(48時間)を過ぎた提示を expired にする(D-13)。
-- 注: volunteer_offers は RLS で本人しか読めないため、教師が候補を見るには
--     security definer が必要。関数内で「依頼の担当教師本人か、service_role か」を検証する。

begin;

-- 期限切れ判定の走査を軽くする(未応答の提示だけを見る)
create index if not exists idx_moff_pending_expiry
  on match_offers(expires_at) where status = 'offered';

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
    where vo.is_active
      and u.role = 'volunteer'
      and u.account_status in ('approved', 'active')
      -- 呼び出し元の検証: 依頼の担当教師本人、または service_role(auth.uid() が null)
      and (auth.uid() is null or auth.uid() = r.teacher_id)
      -- 当該校でブロック中のボランティアは除外
      and not exists (
        select 1 from block_list bl
        where bl.volunteer_id = vo.volunteer_id
          and bl.school_id = r.school_id
          and bl.status = 'approved'
      )
      -- 同じ依頼で既に提示済み(承諾/辞退/期限切れ含む)は再提示しない
      and not exists (
        select 1 from match_offers mo
        where mo.request_id = p_request_id
          and mo.volunteer_id = vo.volunteer_id
      )
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
--   候補一覧や提示一覧の表示前に呼び、状態を最新化する用途。
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

revoke all on function public.match_volunteer_candidates(uuid, vector, float, int) from public;
revoke all on function public.expire_match_offers() from public;
grant execute on function public.match_volunteer_candidates(uuid, vector, float, int)
  to authenticated, service_role;
grant execute on function public.expire_match_offers() to authenticated, service_role;

commit;
