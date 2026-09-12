-- まなびのわ スキーマ DDL
-- 出典: manabi-no-wa-database.md v1.4 / 初期リリース25テーブル(classroom_courses は F-GC 後送のため除外)
-- 対象: PostgreSQL (Supabase / Tokyo)。auth スキーマ・auth.uid()/auth.jwt() は Supabase 前提。
-- 適用順: 拡張 → enum → テーブル → 索引 → 関数 → RLS → トリガ
-- 注: enum/拡張/RLS/関数/トリガは drizzle-kit で扱いきれないため本SQLで管理(設計書 §10)。

begin;

-- =====================================================================
-- 1. 拡張機能
-- =====================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector
create extension if not exists pg_trgm;    -- 日本語キーワード部分一致
-- pgmq(ジョブキュー)は Supabase 側で有効化。本スキーマには表を作らない。

-- =====================================================================
-- 2. 列挙型(enum)
-- =====================================================================
create type user_role            as enum ('teacher','student','volunteer','community','admin','board');
create type account_status       as enum ('pending','approved','rejected','active');
create type school_type          as enum ('elementary','junior_high');
create type request_status       as enum ('open','matching','matched','closed','expired');
create type match_offer_status   as enum ('offered','accepted','declined','expired');
create type session_status       as enum ('scheduled','in_progress','paused','completed','cancelled');
create type session_role         as enum ('teacher','volunteer','student');
create type community_category   as enum ('poster','event','lecturer','other');
create type community_status     as enum ('pending','accepted','rejected');
create type block_status         as enum ('pending','approved','rejected');
create type consent_status       as enum ('pending','signed');
create type inquiry_category     as enum ('bug','usage','unblock','consent','deletion','other');
create type inquiry_status       as enum ('open','in_progress','answered','closed');
create type alert_level          as enum ('low','medium','high','urgent');
create type alert_status         as enum ('open','acknowledged','resolved');
create type notification_channel as enum ('email','push');
create type notification_category as enum ('matching','session_reminder','community','safety_alert','message','consent');
create type notification_status  as enum ('sent','failed','retrying');
create type actor_type           as enum ('user','operator','parent','system','ai');

-- =====================================================================
-- 3. テーブル定義(依存順)
-- =====================================================================

-- ---- マスタ ----
create table municipalities (
  code        text primary key,
  name        text not null,
  prefecture  text not null
);

create table schools (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  school_type       school_type not null,
  municipality_code text not null references municipalities(code) on delete restrict,
  workspace_domain  text unique,
  address           text,
  -- 録画可否は Workspace エディション依存。E-08「初回指導 かつ 録画対応校」の判定に使用
  recording_enabled boolean not null default false,
  created_at        timestamptz not null default now()
);

create table users (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              user_role not null,
  account_status    account_status not null default 'active',
  full_name         text not null,
  email             text not null,
  school_id         uuid references schools(id) on delete set null,
  municipality_code text references municipalities(code) on delete restrict, -- 教委のみ
  subject           text,
  grade             text,
  intro             text,
  rating_avg        numeric(3,2),       -- 非正規化(volunteer_reviews から集計)
  session_count     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table operators (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---- ボランティア軸 ----
create table volunteer_offers (
  id            uuid primary key default gen_random_uuid(),
  volunteer_id  uuid not null references users(id) on delete cascade,
  subjects      text[] not null,
  grades        text[] not null,
  availability  text,
  intro         text,
  search_text   text,
  embedding     vector(768),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table volunteer_requests (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references users(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete restrict,
  subject     text not null,
  grade       text not null,
  desired_at  timestamptz,
  detail      text not null,
  search_text text,
  embedding   vector(768),
  status      request_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table match_offers (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references volunteer_requests(id) on delete cascade,
  volunteer_id  uuid not null references users(id) on delete cascade,
  status        match_offer_status not null default 'offered',
  offered_at    timestamptz not null default now(),
  responded_at  timestamptz,
  expires_at    timestamptz not null,        -- 承諾期限 48h
  unique (request_id, volunteer_id)
);

create table volunteer_sessions (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null references volunteer_requests(id) on delete cascade,
  teacher_id          uuid not null references users(id) on delete cascade,
  volunteer_id        uuid not null references users(id) on delete cascade,
  school_id           uuid not null references schools(id) on delete restrict,
  scheduled_at        timestamptz,
  meet_url            text,
  status              session_status not null default 'scheduled',
  is_first            boolean not null default false,
  recording_required  boolean not null default false,
  recording_url       text,                  -- 教師が手動登録
  teacher_reflection  text,
  volunteer_reflection text,
  ai_summary          text,
  reminder_sent_at    timestamptz,           -- E-05 リマインド送信済み(null=未送信)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table session_participants (
  session_id      uuid not null references volunteer_sessions(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role_in_session session_role not null,
  primary key (session_id, user_id)
);

create table volunteer_reviews (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references volunteer_sessions(id) on delete cascade,
  volunteer_id  uuid not null references users(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

-- ---- 地域軸 ----
create table community_requests (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references users(id) on delete cascade,
  category        community_category not null,
  target_school_id uuid not null references schools(id) on delete restrict,
  title           text not null,
  detail          text not null,
  due_date        date,
  status          community_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table community_library (
  id                uuid primary key default gen_random_uuid(),
  source_request_id uuid not null references community_requests(id) on delete cascade,
  school_id         uuid not null references schools(id) on delete restrict,
  title             text not null,
  category          community_category not null,
  provider          text,
  drive_url         text,
  search_text       text,
  embedding         vector(768),
  created_at        timestamptz not null default now()
);

-- ---- セッション内通信・安全 ----
create table chat_messages (
  id            bigint generated always as identity primary key,
  session_id    uuid not null references volunteer_sessions(id) on delete cascade,
  sender_id     uuid references users(id) on delete set null,
  body          text not null,
  ai_checked    boolean not null default false,
  ai_risk_level alert_level,
  created_at    timestamptz not null default now()
);

create table audit_logs (
  id          bigint generated always as identity primary key,
  event_type  text not null,
  actor_type  actor_type not null default 'system',
  actor_id    uuid,                 -- FKは張らない(多種主体・削除耐性)
  actor_label text,
  session_id  uuid references volunteer_sessions(id) on delete set null,
  target_id   uuid,
  alert_level alert_level,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create table safety_alerts (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references volunteer_sessions(id) on delete cascade,
  chat_message_id bigint references chat_messages(id) on delete set null,
  volunteer_id    uuid not null references users(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete restrict,
  level           alert_level not null,
  status          alert_status not null default 'open',
  handled_by      uuid references users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table block_list (
  id            uuid primary key default gen_random_uuid(),
  volunteer_id  uuid not null references users(id) on delete cascade,
  school_id     uuid not null references schools(id) on delete restrict,
  requested_by  uuid references users(id) on delete set null,      -- 申請者が消えてもブロックは残す
  reason        text not null,
  status        block_status not null default 'pending',
  decided_by    uuid references operators(id) on delete set null,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

-- ---- 同意・通知・問い合わせ・メッセージ ----
create table consent_records (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references users(id) on delete cascade,
  token         text not null unique,
  parent_name   text,
  consent_items jsonb,
  status        consent_status not null default 'pending',
  signed_at     timestamptz,
  signer_ip     text,
  created_at    timestamptz not null default now()
);

create table notification_prefs (
  user_id       uuid primary key references users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled  boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table notification_categories (
  user_id   uuid not null references users(id) on delete cascade,
  category  notification_category not null,
  enabled   boolean not null default true,
  primary key (user_id, category)
);

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create table notification_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references users(id) on delete set null,
  channel    notification_channel not null,
  category   notification_category not null,
  status     notification_status not null,
  attempts   int not null default 1,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create table inquiries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,    -- 未ログインは null
  contact_email text,
  role_snapshot text,
  category      inquiry_category not null,
  subject       text not null,
  body          text not null,
  status        inquiry_status not null default 'open',
  handled_by    uuid references operators(id) on delete set null,
  response      text,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table message_threads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create table message_thread_participants (
  thread_id uuid not null references message_threads(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  primary key (thread_id, user_id)
);

create table messages (
  id         bigint generated always as identity primary key,
  thread_id  uuid not null references message_threads(id) on delete cascade,
  sender_id  uuid references users(id) on delete set null,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 4. 索引
-- =====================================================================
-- ベクトル意味検索(HNSW + cosine)
create index idx_voff_embedding on volunteer_offers   using hnsw (embedding vector_cosine_ops);
create index idx_vreq_embedding on volunteer_requests using hnsw (embedding vector_cosine_ops);
create index idx_clib_embedding on community_library  using hnsw (embedding vector_cosine_ops);
-- キーワード部分一致(pg_trgm + GIN)
create index idx_voff_search on volunteer_offers  using gin (search_text gin_trgm_ops);
create index idx_clib_search on community_library using gin (search_text gin_trgm_ops);

-- 外部キー/検索用
create index idx_schools_muni        on schools(municipality_code);
create index idx_users_role          on users(role);
create index idx_users_school        on users(school_id);
create index idx_users_acct          on users(account_status);
create index idx_voff_volunteer      on volunteer_offers(volunteer_id);
create index idx_vreq_teacher        on volunteer_requests(teacher_id);
create index idx_vreq_school         on volunteer_requests(school_id);
create index idx_vreq_status         on volunteer_requests(status);
create index idx_moff_volunteer      on match_offers(volunteer_id, status);
create index idx_moff_request        on match_offers(request_id);
create index idx_vses_teacher        on volunteer_sessions(teacher_id);
create index idx_vses_volunteer      on volunteer_sessions(volunteer_id);
create index idx_vses_school         on volunteer_sessions(school_id);
create index idx_vses_status         on volunteer_sessions(status);
create index idx_vses_scheduled      on volunteer_sessions(scheduled_at);
create index idx_spart_user          on session_participants(user_id);
create index idx_vrev_volunteer      on volunteer_reviews(volunteer_id);
create index idx_creq_school         on community_requests(target_school_id);
create index idx_creq_status         on community_requests(status);
create index idx_creq_community      on community_requests(community_id);
create index idx_clib_school         on community_library(school_id);
create index idx_chat_session        on chat_messages(session_id, created_at);
create index idx_chat_unchecked      on chat_messages(id) where ai_checked = false;  -- AI監視キュー
create index idx_audit_created       on audit_logs(created_at);
create index idx_audit_event         on audit_logs(event_type);
create index idx_audit_actor         on audit_logs(actor_type, actor_id);
create index idx_audit_session       on audit_logs(session_id);
create index idx_alert_school_status on safety_alerts(school_id, status);  -- 未対応一覧
create index idx_alert_session       on safety_alerts(session_id);
create index idx_alert_volunteer     on safety_alerts(volunteer_id);
create index idx_block_volunteer     on block_list(volunteer_id);
create unique index uq_block_approved on block_list(volunteer_id, school_id) where status = 'approved';
create index idx_consent_student     on consent_records(student_id);
create index idx_nlog_user           on notification_logs(user_id);
create index idx_nlog_failed         on notification_logs(id) where status = 'failed';  -- リトライ判定
create index idx_inq_user            on inquiries(user_id);
create index idx_inq_status          on inquiries(status);
create index idx_inq_category        on inquiries(category);
create index idx_psub_user           on push_subscriptions(user_id);
create index idx_mtp_user            on message_thread_participants(user_id);
create index idx_msg_thread          on messages(thread_id, created_at);

-- =====================================================================
-- 5. ヘルパ関数(JWTクレーム参照・再帰回避)
-- =====================================================================
-- 注: Postgres 組込みの current_role と衝突するため app_ プレフィックス。
create or replace function public.app_current_role() returns text
  language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.current_school_id() returns uuid
  language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'school_id', '')::uuid
$$;

-- セッション参加判定(security definer で session_participants の RLS を回避し再帰を防ぐ)
create or replace function public.is_session_participant(sid uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from session_participants
    where session_id = sid and user_id = auth.uid()
  )
$$;

-- セッションを共有する相手か(参加者同士の表示用)
create or replace function public.shares_session(target_user uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from session_participants a
    join session_participants b on a.session_id = b.session_id
    where a.user_id = auth.uid() and b.user_id = target_user
  )
$$;

-- =====================================================================
-- 6. RLS(全テーブル有効化 + ポリシー)
--    authenticated に広く GRANT し、アクセスは RLS で制御。
--    service_role は BYPASSRLS のため RLS ポリシーは不要だが、
--    テーブル権限(GRANT)自体は必要(運営・バッチ・AI監視・通知配信)。
-- =====================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 今後作成するテーブル・シーケンスにも自動で同権限を付与
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

alter table municipalities             enable row level security;
alter table schools                    enable row level security;
alter table users                      enable row level security;
alter table operators                  enable row level security;
alter table volunteer_offers           enable row level security;
alter table volunteer_requests         enable row level security;
alter table match_offers               enable row level security;
alter table volunteer_sessions         enable row level security;
alter table session_participants       enable row level security;
alter table volunteer_reviews          enable row level security;
alter table community_requests         enable row level security;
alter table community_library          enable row level security;
alter table chat_messages              enable row level security;
alter table audit_logs                 enable row level security;
alter table safety_alerts              enable row level security;
alter table block_list                 enable row level security;
alter table consent_records            enable row level security;
alter table notification_prefs         enable row level security;
alter table notification_categories    enable row level security;
alter table push_subscriptions         enable row level security;
alter table notification_logs          enable row level security;
alter table inquiries                  enable row level security;
alter table message_threads            enable row level security;
alter table message_thread_participants enable row level security;
alter table messages                   enable row level security;

-- マスタ: 認証ユーザーは参照のみ(更新は service role)
create policy municipalities_select on municipalities for select to authenticated using (true);
create policy schools_select        on schools        for select to authenticated using (true);
-- operators: 認証ユーザーからは不可(ポリシーを作らない = service role / admin URL のみ)

-- users
create policy users_self_select   on users for select to authenticated using (id = auth.uid());
create policy users_self_update   on users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy users_admin_select  on users for select to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id());
create policy users_shared_select on users for select to authenticated using (shares_session(id));

-- volunteer_offers
create policy voff_owner_all on volunteer_offers for all to authenticated
  using (volunteer_id = auth.uid()) with check (volunteer_id = auth.uid());
create policy voff_match_select on volunteer_offers for select to authenticated
  using (app_current_role() in ('teacher','admin') and is_active);

-- volunteer_requests
create policy vreq_owner_all on volunteer_requests for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy vreq_admin_rw on volunteer_requests for all to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id())
  with check (app_current_role() = 'admin' and school_id = current_school_id());
create policy vreq_vol_select on volunteer_requests for select to authenticated
  using (exists (select 1 from match_offers mo where mo.request_id = volunteer_requests.id and mo.volunteer_id = auth.uid()));

-- match_offers
create policy moff_vol_select on match_offers for select to authenticated using (volunteer_id = auth.uid());
create policy moff_vol_update on match_offers for update to authenticated
  using (volunteer_id = auth.uid()) with check (volunteer_id = auth.uid());
create policy moff_teacher_select on match_offers for select to authenticated
  using (exists (select 1 from volunteer_requests r where r.id = match_offers.request_id and r.teacher_id = auth.uid()));
create policy moff_admin_select on match_offers for select to authenticated
  using (app_current_role() = 'admin'
         and exists (select 1 from volunteer_requests r where r.id = match_offers.request_id and r.school_id = current_school_id()));

-- volunteer_sessions
create policy vses_participant_select on volunteer_sessions for select to authenticated using (is_session_participant(id));
create policy vses_teacher_update on volunteer_sessions for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy vses_vol_update on volunteer_sessions for update to authenticated
  using (volunteer_id = auth.uid()) with check (volunteer_id = auth.uid());
create policy vses_admin_select on volunteer_sessions for select to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id());

-- session_participants(本人の参加行のみ)
create policy spart_self_select on session_participants for select to authenticated using (user_id = auth.uid());

-- volunteer_reviews
create policy vrev_teacher_rw on volunteer_reviews for all to authenticated
  using (exists (select 1 from volunteer_sessions s where s.id = volunteer_reviews.session_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from volunteer_sessions s where s.id = volunteer_reviews.session_id and s.teacher_id = auth.uid()));
create policy vrev_vol_select on volunteer_reviews for select to authenticated using (volunteer_id = auth.uid());
create policy vrev_admin_select on volunteer_reviews for select to authenticated
  using (app_current_role() = 'admin'
         and exists (select 1 from volunteer_sessions s where s.id = volunteer_reviews.session_id and s.school_id = current_school_id()));

-- community_requests
create policy creq_owner_select on community_requests for select to authenticated using (community_id = auth.uid());
create policy creq_school_rw on community_requests for all to authenticated
  using (app_current_role() in ('teacher','admin') and target_school_id = current_school_id())
  with check (app_current_role() in ('teacher','admin') and target_school_id = current_school_id());

-- community_library
create policy clib_school_select on community_library for select to authenticated
  using (app_current_role() in ('teacher','admin') and school_id = current_school_id());

-- chat_messages(参加者のみ閲覧・投稿。更新/削除ポリシーは作らない = 監査保全)
create policy chat_select on chat_messages for select to authenticated using (is_session_participant(session_id));
create policy chat_insert on chat_messages for insert to authenticated
  with check (is_session_participant(session_id) and sender_id = auth.uid());

-- audit_logs(所属校一致の管理が SELECT。INSERT/UPDATE/DELETE は service role)
create policy audit_admin_select on audit_logs for select to authenticated
  using (app_current_role() = 'admin'
         and exists (select 1 from volunteer_sessions s where s.id = audit_logs.session_id and s.school_id = current_school_id()));

-- safety_alerts(所属校一致の管理が閲覧・対応更新。発報は service role)
create policy alert_admin_select on safety_alerts for select to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id());
create policy alert_admin_update on safety_alerts for update to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id())
  with check (app_current_role() = 'admin' and school_id = current_school_id());

-- block_list(所属校一致の管理が申請・閲覧。審査は service role)
create policy block_admin_select on block_list for select to authenticated
  using (app_current_role() = 'admin' and school_id = current_school_id());
create policy block_admin_insert on block_list for insert to authenticated
  with check (app_current_role() = 'admin' and school_id = current_school_id() and requested_by = auth.uid());

-- consent_records(所属校一致の管理が SELECT。署名はtoken検証で service role)
create policy consent_admin_select on consent_records for select to authenticated
  using (app_current_role() = 'admin'
         and exists (select 1 from users u where u.id = consent_records.student_id and u.school_id = current_school_id()));

-- 通知設定・購読(本人のみ)
create policy nprefs_self on notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ncat_self on notification_categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy psub_self on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notification_logs(本人は自分宛を SELECT。書込は service role)
create policy nlog_self_select on notification_logs for select to authenticated using (user_id = auth.uid());

-- inquiries(本人は自分の問い合わせを SELECT/INSERT。未ログイン受付は service role)
create policy inq_self_select on inquiries for select to authenticated using (user_id = auth.uid());
create policy inq_self_insert on inquiries for insert to authenticated with check (user_id = auth.uid());

-- メッセージ(大人スレッド参加者のみ)
create policy thread_select on message_threads for select to authenticated
  using (exists (select 1 from message_thread_participants p where p.thread_id = message_threads.id and p.user_id = auth.uid()));
create policy mtp_self_select on message_thread_participants for select to authenticated using (user_id = auth.uid());
create policy msg_select on messages for select to authenticated
  using (exists (select 1 from message_thread_participants p where p.thread_id = messages.thread_id and p.user_id = auth.uid()));
create policy msg_insert on messages for insert to authenticated
  with check (sender_id = auth.uid()
              and exists (select 1 from message_thread_participants p where p.thread_id = messages.thread_id and p.user_id = auth.uid()));

-- =====================================================================
-- 7. トリガ
-- =====================================================================
-- updated_at 自動更新
create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_users_updated  before update on users              for each row execute function set_updated_at();
create trigger trg_voff_updated   before update on volunteer_offers   for each row execute function set_updated_at();
create trigger trg_vreq_updated   before update on volunteer_requests for each row execute function set_updated_at();
create trigger trg_vses_updated   before update on volunteer_sessions for each row execute function set_updated_at();
create trigger trg_creq_updated   before update on community_requests for each row execute function set_updated_at();
create trigger trg_inq_updated    before update on inquiries          for each row execute function set_updated_at();
create trigger trg_nprefs_updated before update on notification_prefs for each row execute function set_updated_at();

-- メッセージスレッド参加者は大人ロールのみ(生徒禁止)
create or replace function public.enforce_adult_thread_participant() returns trigger
  language plpgsql as $$
begin
  if (select role from users where id = new.user_id) = 'student' then
    raise exception 'students cannot join message threads (user_id=%)', new.user_id;
  end if;
  return new;
end;
$$;
create trigger trg_mtp_adult before insert on message_thread_participants
  for each row execute function enforce_adult_thread_participant();

-- ボランティア実績(rating_avg / session_count)の集計同期
create or replace function public.update_volunteer_stats() returns trigger
  language plpgsql as $$
begin
  update users set
    session_count = (select count(*) from volunteer_reviews where volunteer_id = new.volunteer_id),
    rating_avg    = (select round(avg(rating)::numeric, 2) from volunteer_reviews where volunteer_id = new.volunteer_id)
  where id = new.volunteer_id;
  return new;
end;
$$;
create trigger trg_vrev_stats after insert on volunteer_reviews
  for each row execute function update_volunteer_stats();

-- =====================================================================
-- 8. Realtime(セッション内チャットの購読 / E-10)
--    Supabase Realtime は publication `supabase_realtime` を購読する。
--    受信可否は chat_messages の RLS に従う(= セッション参加者のみ)。
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_messages'
     )
  then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;

-- =====================================================================
-- 9. マッチング関数(Dフロー D-07/D-11/D-13)
--    is_offerable_volunteer()     … 提示可否の共通判定。ブロック中・未承認・
--                                   非アクティブ・提示済みを除外する。候補検索と
--                                   提示の両方から呼び、条件の食い違いを防ぐ
--    match_volunteer_candidates() … pgvector 類似検索で候補を返す。埋め込み未生成の
--                                   環境では教科・学年の条件一致にフォールバックする
--    expire_match_offers()        … 承諾期限(48時間)を過ぎた提示を expired にする
--    ※ 定義本体は web/db/migrations/0004_matching.sql を参照
-- =====================================================================

commit;
