-- まなびのわ 追加DDL: 録画対応校フラグ
-- 目的: Eフロー E-08「初回かつ録画対応校か判定」の判定元。
--       学校ごとに録画運用の可否を持たせ、初回セッション時に
--       volunteer_sessions.recording_required を立てる根拠にする。
-- 既定値は false(録画しない)。運用開始済みの学校は個別に true へ更新する。

begin;

alter table schools
  add column if not exists recording_enabled boolean not null default false;

comment on column schools.recording_enabled is
  '録画対応校フラグ。true の場合、初回セッションで録画を必須とする(E-08)。';

commit;
