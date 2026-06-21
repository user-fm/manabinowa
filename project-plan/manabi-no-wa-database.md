# 「まなびのわ」データベース設計書

**v1.4 - 2026年6月16日**

**プロジェクト名**: まなびのわ (Manabi no Wa)
**基準ドキュメント**: 要件定義書 v1.9 / 業務フロー図 v2.10(§8 データモデル概要)
**v1.2 変更点(DDL化前の再検証)**: (1) `school_type` enum を §3 に追加 (2) ヘルパ `current_role()` は Postgres 組込みと衝突するため `app_current_role()` へ改名 (3) §7.1 にFKの ON DELETE 方針を明記 (4) users の備考が operators 下に紛れていたのを是正
**v1.3 変更点(再検証2巡目)**: (5) 必須FK/キー列に `not null` を補完(volunteer_sessions の請求/教師/V/学校・volunteer_reviews.session_id・community_library.source_request_id/school_id・consent_records.token) (6) `message_thread_participants` の RLS(自分の参加行 SELECT)を明記し `messages` ポリシー成立を担保 (7) `block_list.requested_by` の ON DELETE を SET NULL に(申請者削除でもブロック記録を保持)
**v1.4 変更点(テーブル追加/整理)**: (8) `safety_alerts` を新設(AI監視アラートの対応ワークフロー H-07〜H-09。status=open/acknowledged/resolved の3段階)。`alert_status` enum 追加 (9) `classroom_courses` を初期リリース対象外(F-GC後送)と明記。全 26 テーブル(初期 25)
**DBMS**: PostgreSQL (Supabase Cloud / Tokyo `ap-northeast-1`)
**ORM/マイグレーション**: Drizzle ORM + drizzle-kit。RLS ポリシーは SQL マイグレーションで管理

---

## 1. 設計方針

### 1.1 共通ルール

- **主キー**: 認証ユーザーに紐づく `users` は `auth.users.id`(uuid)をそのまま採用。他テーブルは `uuid`(`gen_random_uuid()`)を既定とし、大量行が見込まれる `chat_messages` / `audit_logs` / `notification_logs` / `messages` は `bigint`(identity)を採用する。
- **タイムスタンプ**: すべて `timestamptz`。`created_at` は `default now()`、更新があるテーブルは `updated_at` をトリガで自動更新。
- **命名**: テーブル・列ともに snake_case(要件 §8 のテーブル名に準拠)。
- **文字列の列挙値**: Postgres の `enum` 型で定義(§3)。
- **論理削除はしない**: 個人情報削除要求(Flow K / K-06)は物理削除を基本とし、監査ログ側は `actor_id` を `null` 化して匿名化する(§7)。

### 1.2 拡張機能

| 拡張 | 用途 |
|---|---|
| pgcrypto | `gen_random_uuid()` |
| pgvector | 意味検索(`vector(768)`、HNSW + cosine) |
| pg_trgm | 日本語キーワードの部分一致(GIN + `gin_trgm_ops`) |
| pgmq | ジョブキュー(通知・リマインド・Embedding 生成) |

### 1.3 データアクセスと RLS の前提(要件 §6.2 と整合)

- **全テーブルで RLS を有効化**する。
- **ユーザー文脈の読み書きは `@supabase/supabase-js`** 経由(ユーザーJWTで接続し `auth.uid()` が効く)。
- **マイグレーション・バッチ・Embedding生成・AI監視・通知配信などの信頼ジョブは Drizzle + service role**(RLS を迂回。アプリのユーザー操作には使わない)。
- ロール判定の再帰参照(`users` を引くRLSが `users` のRLSを誘発)を避けるため、**ロールと所属は JWT カスタムクレームに載せる**(Supabase の access-token hook で `app_metadata.role` / `app_metadata.school_id` / `app_metadata.municipality_code` を付与)。RLS はこのクレームを参照する(§6 のヘルパ関数)。

### 1.4 アクターと識別子(actor_type)

DB の `users.role` に載らない主体(運営・保護者・システム・AI)も含め、システム上の名称を `actor_type` で一元化する。監査ログ(audit_logs)やイベント記録の主体はこの種別で表す。

| 概念 | actor_type | システム識別子 | DB上の実体 | 表示名 |
|---|---|---|---|---|
| 6ロール | user | `users.role` の値(teacher/student/volunteer/community/admin/board) | users 行 | 教師〜教育委員会 |
| サービス運営者 | operator | `operators.id` | **operators 表** | 運営(まなびのわ事務局) |
| 保護者 | parent | `consent_records.token` | consent_records 行 | 保護者 |
| システム自動処理 | system | `actor_label`(例 `system:cron` / `system:edge`) | テーブルなし(定数) | システム |
| AI処理 | ai | `actor_label`(例 `vertex/gemini-3.5-flash`) | テーブルなし(定数) | AI |

> 6ロールの DB識別子・UI表示名・フロー略号の対応はフロー図 §0(略号表)と一致。`system`/`ai`/`parent` は購読・設定を持たないためテーブルを作らず、定数識別子(`actor_label`)で表す。

### 1.4.1 テーブルの区分(マスタ / トランザクション / 他)

| 区分 | テーブル |
|---|---|
| マスタ・エンティティ | municipalities / schools / users / operators |
| 設定・購読 | notification_prefs / notification_categories / push_subscriptions |
| 同期キャッシュ | classroom_courses(初期リリース対象外=F-GC後送) |
| **トランザクション(業務データ)** | volunteer_offers / volunteer_requests / **match_offers** / volunteer_sessions / session_participants / **volunteer_reviews** / community_requests / community_library / chat_messages / **safety_alerts** / block_list / consent_records / inquiries / message_threads / message_thread_participants / messages |
| ログ・監査(追記専用) | audit_logs / notification_logs |

---

## 2. ER 概要(主要な関連)

```text
municipalities 1──* schools
municipalities 1──* users(board のみ)
schools 1──* users
users(teacher) 1──* volunteer_requests 1──* match_offers *──1 users(volunteer)
volunteer_requests 1──1 volunteer_sessions（match_offers.accepted から生成）
volunteer_sessions 1──* session_participants *──1 users
volunteer_sessions 1──* chat_messages *──1 users(sender)
volunteer_sessions 1──* safety_alerts(AI監視。chat_messages を検知元に参照、handled_by=管理)
volunteer_sessions 1──0..1 volunteer_reviews *──1 users(volunteer)
users(volunteer) 1──* volunteer_offers
users 1──* push_subscriptions
users(community) 1──* community_requests 1──0..1 community_library
users(teacher) 1──* classroom_courses
users(student) 1──* consent_records
users(admin) 1──* block_list *──1 users(volunteer)
users 1──1 notification_prefs / 1──* notification_categories / 1──* push_subscriptions / 1──* notification_logs
users 0..1──* inquiries
message_threads 1──* message_thread_participants *──1 users(大人のみ)
message_threads 1──* messages *──1 users(sender)
operators 1──* block_list(decided_by) / inquiries(handled_by)
（監査）audit_logs は actor_type + actor_id で多種の主体を記録（user/operator/parent/system/ai。FKなし）
```

---

## 3. 列挙型(enum)

| 型名 | 値 |
|---|---|
| user_role | teacher / student / volunteer / community / admin / board |
| account_status | pending / approved / rejected / active(学校アカウントは active 既定、個人Gmailは pending→approved) |
| school_type | elementary / junior_high |
| request_status | open / matching / matched / closed / expired |
| match_offer_status | offered / accepted / declined / expired |
| session_status | scheduled / in_progress / paused / completed / cancelled |
| session_role | teacher / volunteer / student |
| community_category | poster / event / lecturer / other |
| community_status | pending / accepted / rejected |
| block_status | pending / approved / rejected |
| consent_status | pending / signed |
| inquiry_category | bug / usage / unblock / consent / deletion / other |
| inquiry_status | open / in_progress / answered / closed |
| alert_level | low / medium / high / urgent(低/中/高/緊急) |
| alert_status | open / acknowledged / resolved(アラートの対応状態) |
| notification_channel | email / push |
| notification_category | matching / session_reminder / community / safety_alert / message |
| notification_status | sent / failed / retrying |
| actor_type | user / operator / parent / system / ai(監査・イベントの主体種別) |

---

## 4. テーブル定義

> 各テーブルの「RLS」は方針(意図)を記す。代表的な SQL ポリシーは §6 にまとめる。
> 「所属校一致」は JWT クレーム `school_id` と行の `school_id` の一致を指す。

### 4.1 基盤

#### municipalities — 自治体マスタ

| 列 | 型 | 制約 |
|---|---|---|
| code | text | PK(自治体コード) |
| name | text | not null |
| prefecture | text | not null |

- 索引: PK(code)
- RLS: 認証ユーザーは SELECT 可。INSERT/UPDATE は service role(マスタ投入)のみ。
- 備考: `prefecture` をここに集約。schools / users(教委)から参照することで、`municipality_code → prefecture` の推移的従属を排除(§9 正規化メモ)。

#### schools — 学校マスタ(全国公立小中学校)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK default gen_random_uuid() |
| name | text | not null |
| school_type | school_type | not null |
| municipality_code | text | FK→municipalities(code), not null(都道府県は municipalities 側に保持) |
| workspace_domain | text | unique(例: `minato.ed.jp`。B-07 ドメイン判定) |
| address | text | |
| created_at | timestamptz | default now() |

- 索引: `unique(workspace_domain)` / `index(municipality_code)`
- RLS: 認証ユーザーは SELECT 可(マッチングや依頼先選択で学校一覧が要るため)。INSERT/UPDATE は service role(マスタ投入)のみ。

#### users — 全ユーザー(6ロール統一)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK、references auth.users(id) on delete cascade |
| role | user_role | not null |
| account_status | account_status | not null default 'active' |
| full_name | text | not null |
| email | text | not null |
| school_id | uuid | FK→schools(id) on delete set null(教師/生徒/管理/教委。V・地域は null) |
| municipality_code | text | FK→municipalities(code)。**教委の所管自治体のみ**設定。学校所属ロールは school 経由で導出するため null(推移的従属の回避) |
| subject | text | 担当教科(教師) |
| grade | text | 学年(生徒/教師) |
| intro | text | 自己紹介(V/地域) |
| rating_avg | numeric(3,2) | V実績の平均評価(E-16 で更新、非正規化) |
| session_count | int | not null default 0(V実績件数) |
| created_at / updated_at | timestamptz | |

- 索引: `index(role)` / `index(school_id)` / `index(account_status)`
- RLS: 本人は自分の行を SELECT/UPDATE。管理は所属校一致の行を SELECT。教師はセッション関係の生徒のみ参照(`session_participants` 経由)。**教委は個別行を参照しない**(集計ビュー経由・§7)。サービス運営者は admin ポータル(service role)。
- 備考: 個人Gmail(V/地域)は `account_status='pending'` で作成し、審査承認(B-16)で `approved`。
- 非正規化(意図的): `rating_avg` / `session_count` は `volunteer_reviews` からの集計値(候補一覧 D-10 の読み取り高速化のためトリガで同期)。`email` は auth.users のミラー。いずれも §9 正規化メモに記載。

#### operators — サービス運営者(まなびのわ事務局・F-AUTH-06)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK default gen_random_uuid() |
| full_name | text | not null |
| email | text | not null unique |
| is_active | boolean | not null default true |
| created_at | timestamptz | default now() |

- 索引: `unique(email)`
- RLS: 一般ユーザーからは不可。**別ドメインの admin URL(F-AUTH-06)/ service role のみ**。
- 備考: `users` とは別管理。審査・対応の主体として `block_list.decided_by` / `inquiries.handled_by` / `audit_logs`(actor_type='operator')から参照され、「誰が承認・対応したか」を追跡可能にする。

### 4.2 ボランティア軸(Flow C / D / E)

#### volunteer_offers — ボランティアの提供スキル

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| volunteer_id | uuid | FK→users(id) on delete cascade, not null |
| subjects | text[] | not null(対応教科) |
| grades | text[] | not null(対応学年) |
| availability | text | 空き時間 |
| intro | text | |
| search_text | text | 検索・分かち書き用に連結した本文 |
| embedding | vector(768) | gemini-embedding-2(Vertex AI) |
| is_active | boolean | not null default true |
| created_at / updated_at | timestamptz | |

- 索引: `HNSW(embedding vector_cosine_ops)` / `GIN(search_text gin_trgm_ops)` / `index(volunteer_id)`
- RLS: 本人は自分の offer を全操作。マッチング候補表示のため、教師・管理は SELECT 可(`is_active` のみ)。Embedding 生成・類似検索は service role。

#### volunteer_requests — 学校からの依頼

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK→users(id), not null |
| school_id | uuid | FK→schools(id), not null |
| subject | text | not null |
| grade | text | not null |
| desired_at | timestamptz | 希望日時 |
| detail | text | not null |
| search_text | text | |
| embedding | vector(768) | |
| status | request_status | not null default 'open' |
| created_at / updated_at | timestamptz | |

- 索引: `HNSW(embedding vector_cosine_ops)` / `index(teacher_id)` / `index(school_id)` / `index(status)`
- RLS: 作成者(教師)と所属校一致の管理は SELECT/UPDATE。マッチング処理は service role。

#### match_offers — 依頼に対する打診と応答(F-VOL-04 / D-11〜D-14)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| request_id | uuid | FK→volunteer_requests(id) on delete cascade, not null |
| volunteer_id | uuid | FK→users(id), not null |
| status | match_offer_status | not null default 'offered' |
| offered_at | timestamptz | default now() |
| responded_at | timestamptz | |
| expires_at | timestamptz | not null(承諾期限 48時間。D-13) |

- 索引: `unique(request_id, volunteer_id)` / `index(volunteer_id, status)` / `index(request_id)`
- RLS: 依頼作成者(教師)は SELECT。対象ボランティア本人は SELECT と `status` の UPDATE(承諾/辞退)。所属校一致の管理は SELECT。
- 備考: `accepted` になったら `volunteer_sessions` を生成(D-14、Server Action / service role)。期限切れ(`expired`)・辞退時は教師が次候補へ(D-10)。

#### volunteer_sessions — マッチング後の指導セッション

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| request_id | uuid | FK→volunteer_requests(id), not null |
| teacher_id | uuid | FK→users(id), not null |
| volunteer_id | uuid | FK→users(id), not null |
| school_id | uuid | FK→schools(id), not null |
| scheduled_at | timestamptz | |
| meet_url | text | E-02 で生成 |
| status | session_status | not null default 'scheduled' |
| is_first | boolean | not null default false(初回指導か) |
| recording_required | boolean | not null default false(録画対応校かつ初回) |
| recording_url | text | **教師が手動登録**(F-SES-07。null可) |
| teacher_reflection | text | E-13 |
| volunteer_reflection | text | E-13 |
| ai_summary | text | E-14(Vertex AI) |
| created_at / updated_at | timestamptz | |

- 索引: `index(teacher_id)` / `index(volunteer_id)` / `index(school_id)` / `index(status)` / `index(scheduled_at)`
- RLS: 参加者(`session_participants`)は SELECT。教師・ボランティアは自分の担当回の所定列を UPDATE。所属校一致の管理は SELECT。
- 備考: 評価(rating)は履歴として `volunteer_reviews` に持つ(セッション本体には保持しない)。
- 非正規化(意図的): `teacher_id` / `school_id` は `request_id`(→volunteer_requests)から導出可能だが、RLSの所属校スコープ判定で毎回 requests を結合しないために保持。整合はトリガで担保(§9 正規化メモ)。

#### session_participants — セッション参加者(教師/V/生徒)

| 列 | 型 | 制約 |
|---|---|---|
| session_id | uuid | FK→volunteer_sessions(id) on delete cascade |
| user_id | uuid | FK→users(id) on delete cascade |
| role_in_session | session_role | not null |
| PK | | (session_id, user_id) |

- 索引: `index(user_id)`
- RLS: 本人は自分の参加行を SELECT。RLS ヘルパ `is_session_participant()` の元データ。

#### volunteer_reviews — 指導の評価履歴(F-VOL-07 / E-16)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK→volunteer_sessions(id) on delete cascade, not null, unique(1回1評価) |
| volunteer_id | uuid | FK→users(id), not null |
| rating | smallint | not null(1〜5) |
| comment | text | |
| created_at | timestamptz | default now() |

- 索引: `unique(session_id)` / `index(volunteer_id)`
- RLS: 評価者(教師)は INSERT/SELECT。対象ボランティア本人と所属校一致の管理は SELECT。
- 備考: 挿入時にトリガで `users.rating_avg` / `users.session_count`(V実績の非正規化)を集計更新。F-VOL-07 の過去実績表示はこの履歴を参照。

### 4.3 地域軸(Flow F)

#### community_requests — 地域からの依頼

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| community_id | uuid | FK→users(id), not null(地域ロール) |
| category | community_category | not null |
| target_school_id | uuid | FK→schools(id), not null |
| title | text | not null |
| detail | text | not null |
| due_date | date | |
| status | community_status | not null default 'pending' |
| created_at / updated_at | timestamptz | |

- 索引: `index(target_school_id)` / `index(status)` / `index(community_id)`
- RLS: 作成者(地域)は自分の依頼を SELECT。対象校の教師・管理は SELECT と `status` の UPDATE(受入/却下)。

#### community_library — 受入済み地域依頼の素材ライブラリ

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| source_request_id | uuid | FK→community_requests(id), not null |
| school_id | uuid | FK→schools(id), not null |
| title | text | not null |
| category | community_category | not null |
| provider | text | 提供元名 |
| drive_url | text | 教材化先(F-10) |
| search_text | text | |
| embedding | vector(768) | |
| created_at | timestamptz | default now() |

- 索引: `HNSW(embedding vector_cosine_ops)` / `GIN(search_text gin_trgm_ops)` / `index(school_id)`
- RLS: 所属校一致の教師・管理が SELECT。検索は **pgvector(意味)+ pg_trgm(キーワード)**(F-COM-06)。横展開の共有は将来拡張。
- 非正規化(意図的): `school_id` は `source_request_id`(→community_requests.target_school_id)から導出可能だが、RLSの所属校スコープのため保持(§9 正規化メモ)。`provider` は依頼元の表示名スナップショット(アカウント名と独立に保持)。

### 4.4 Google Classroom 連携(Flow G)

#### classroom_courses — コース・名簿の同期キャッシュ

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK→users(id), not null |
| google_course_id | text | not null |
| name | text | |
| student_count | int | |
| linked_session_id | uuid | FK→volunteer_sessions(id) on delete set null(G-06 紐付け) |
| synced_at | timestamptz | |

- 索引: `unique(teacher_id, google_course_id)`
- RLS: 本人(教師)のみ全操作。名簿同期は 1 時間ごとのバッチ(service role)。
- 注: **初期リリース対象外**。Flow G(F-GC)は 8/25 版で後送(schedule §7 縮退案1)のため、本表は G 実装時に作成する。

### 4.5 セッション内通信・安全(Flow E / H / I)

#### chat_messages — セッション内チャット(AI監視対象)

| 列 | 型 | 制約 |
|---|---|---|
| id | bigint | identity PK |
| session_id | uuid | FK→volunteer_sessions(id) on delete cascade, not null |
| sender_id | uuid | FK→users(id) on delete set null |
| body | text | not null |
| ai_checked | boolean | not null default false |
| ai_risk_level | alert_level | null(検知時のみ) |
| created_at | timestamptz | default now() |

- 索引: `index(session_id, created_at)` / 部分索引 `index(id) where ai_checked = false`(AI監視キュー用)
- RLS: セッション参加者は SELECT/INSERT。**UPDATE/DELETE はユーザー不可**(監査保全)。AI監視(H-02/H-03)は service role が読み取り・`ai_checked`/`ai_risk_level` を更新。
- 備考: 高頻度のため `bigint`。将来は月次パーティションを検討。

#### audit_logs — 監査ログ(F-AI-04・3年以上保管・追記専用)

| 列 | 型 | 制約 |
|---|---|---|
| id | bigint | identity PK |
| event_type | text | not null(例: ai_alert, block_decided, consent_signed) |
| actor_type | actor_type | not null default 'system'(行為主体の種別) |
| actor_id | uuid | 主体の論理ID(user/operator は各表のid、parent は consent_record。**FKは張らない**=追記専用・削除耐性) |
| actor_label | text | テーブルを持たない主体の識別子(例: `system:cron` / `vertex/gemini-3.5-flash`) |
| session_id | uuid | FK→volunteer_sessions(id) on delete set null |
| target_id | uuid | 関連エンティティ(汎用) |
| alert_level | alert_level | null |
| detail | jsonb | |
| created_at | timestamptz | default now() |

- 索引: `index(created_at)` / `index(event_type)` / `index(actor_type, actor_id)` / `index(session_id)`
- RLS: **INSERT は service role のみ、UPDATE/DELETE は全員不可(追記専用)**。SELECT は所属校一致の管理。教委は集計ビューのみ(個別 detail は不可)。
- 主体の記録: `actor_type` で user / operator / parent / system / ai を区別(§1.4)。運営・保護者・システム・AI の行為もこれで追跡可能。
- 保持: 3年以上、Tokyo リージョンで暗号化保管(§10.3)。削除要求時は `actor_type='user'` の `actor_id` を匿名化(null化)。

#### block_list — ボランティアのブロック(Flow I)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| volunteer_id | uuid | FK→users(id), not null |
| school_id | uuid | FK→schools(id), not null |
| requested_by | uuid | FK→users(id)(申請した管理) |
| reason | text | not null(I-02 必須) |
| status | block_status | not null default 'pending' |
| decided_by | uuid | FK→operators(id)(審査した運営。I-04) |
| created_at | timestamptz | default now() |
| decided_at | timestamptz | |

- 索引: `index(volunteer_id)` / `unique(volunteer_id, school_id) where status='approved'`
- RLS: 所属校一致の管理が INSERT/SELECT。審査(I-04)は運営(admin ポータル/service role)。マッチング除外(I-07)は service role が approved を参照。

#### safety_alerts — AI監視アラートの対応管理(Flow H・H-07〜H-09)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK default gen_random_uuid() |
| session_id | uuid | FK→volunteer_sessions(id) on delete cascade, not null |
| chat_message_id | bigint | FK→chat_messages(id) on delete set null(検知元メッセージ。null可) |
| volunteer_id | uuid | FK→users(id), not null(対象ボランティア) |
| school_id | uuid | FK→schools(id), not null(RLS所属校スコープ) |
| level | alert_level | not null |
| status | alert_status | not null default 'open'(open→acknowledged→resolved) |
| handled_by | uuid | FK→users(id)(対応した管理。null可) |
| acknowledged_at | timestamptz | 確認時刻 |
| resolved_at | timestamptz | 対応完了時刻 |
| created_at | timestamptz | default now() |

- 索引: `index(school_id, status)`(未対応一覧)/ `index(session_id)` / `index(volunteer_id)`
- RLS: 所属校一致の管理が SELECT と `status`/`handled_by`/`acknowledged_at`/`resolved_at` の UPDATE(確認→対応完了)。教委は集計ビューのみ。INSERT は service role(AI監視 H-05〜H-07)。
- 備考: 検知時に AI監視が service role で INSERT(緊急=`urgent` は H-06a でセッション一時停止)。管理者対応(H-09)で status を `acknowledged`→`resolved` に更新し、対応完了は `audit_logs` にも記録(H-10)。`chat_messages.ai_risk_level` は検知マーカー、本表は対応ワークフローの保持先(役割分担)。
- 非正規化(意図的): `school_id` は session から導出可能だが RLS所属校スコープのため保持(§9.3)。

### 4.6 同意・通知・問い合わせ・メッセージ

#### consent_records — 保護者の電子署名同意(F-AUTH-07・Flow K)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK→users(id), not null |
| token | text | not null unique(メールリンクの署名トークン) |
| parent_name | text | 電子署名(K-12) |
| consent_items | jsonb | 同意項目のスナップショット |
| status | consent_status | not null default 'pending' |
| signed_at | timestamptz | |
| signer_ip | text | |
| created_at | timestamptz | default now() |

- 索引: `index(student_id)` / `unique(token)`
- RLS: **保護者はアカウントを持たない**ため、署名ページはサーバ側で `token` を検証して処理(RLSユーザー文脈ではなく service role)。所属校一致の管理は SELECT。機微情報として参照を制限。

#### notification_prefs — 通知設定(F-NTF-04)

| 列 | 型 | 制約 |
|---|---|---|
| user_id | uuid | PK、FK→users(id) on delete cascade |
| email_enabled | boolean | not null default true(チャネル全体のスイッチ) |
| push_enabled | boolean | not null default true(チャネル全体のスイッチ) |
| updated_at | timestamptz | |

- RLS: 本人のみ全操作。
- 備考: カテゴリ別の on/off は jsonb をやめ、正規化した `notification_categories`(下記)で持つ(1NF・繰り返し列の排除)。

#### notification_categories — 通知カテゴリ別設定(F-NTF-04・中間テーブル)

| 列 | 型 | 制約 |
|---|---|---|
| user_id | uuid | FK→users(id) on delete cascade |
| category | notification_category | (matching/session_reminder/community/safety_alert/message) |
| enabled | boolean | not null default true |
| PK | | (user_id, category) |

- 索引: PK(user_id, category)
- RLS: 本人のみ全操作。
- 備考: ユーザー × カテゴリ の M:1 設定を行で表現(jsonb の繰り返しグループを排除)。配信(Flow J)は `notification_prefs`(チャネル)と本表(カテゴリ)を AND で参照。

#### push_subscriptions — Web Push 購読(F-NTF-02)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK→users(id) on delete cascade, not null |
| endpoint | text | not null(Push サービスのエンドポイントURL) |
| p256dh | text | not null(公開鍵) |
| auth | text | not null(認証シークレット) |
| user_agent | text | 端末識別の補助 |
| created_at | timestamptz | default now() |
| last_used_at | timestamptz | |

- 索引: `unique(endpoint)` / `index(user_id)`
- RLS: 本人のみ全操作(購読登録・解除)。Push 配信(J-08/J-09)は service role が読み取り、無効化された購読は削除。

#### notification_logs — 通知配信履歴(J-10)

| 列 | 型 | 制約 |
|---|---|---|
| id | bigint | identity PK |
| user_id | uuid | FK→users(id) on delete set null |
| channel | notification_channel | not null |
| category | notification_category | not null |
| status | notification_status | not null |
| attempts | int | not null default 1 |
| payload | jsonb | |
| created_at | timestamptz | default now() |

- 索引: `index(user_id)` / 部分索引 `index(id) where status='failed'`(リトライ判定)
- RLS: 本人は自分宛の履歴を SELECT。INSERT/UPDATE は service role(J-11a 再送で更新)。

#### inquiries — お問い合わせ(F-INQ-01〜04)

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK→users(id) on delete set null(未ログインは null) |
| contact_email | text | 未ログイン時の連絡先(L-03a) |
| role_snapshot | text | 受付時のロール表示用 |
| category | inquiry_category | not null |
| subject | text | not null |
| body | text | not null |
| status | inquiry_status | not null default 'open' |
| handled_by | uuid | FK→operators(id)(対応した運営。L-09) |
| response | text | 運営の回答(L-10) |
| responded_at | timestamptz | |
| created_at / updated_at | timestamptz | |

- 索引: `index(user_id)` / `index(status)` / `index(category)`
- RLS: 本人(`user_id`)は自分の問い合わせを SELECT。未ログイン受付はサーバ側(service role)。運営は admin ポータルで全件。`category='deletion'` は削除フロー(K-03)へ連携。

#### message_threads / message_thread_participants / messages — ロール間メッセージ(F-MSG・大人のみ・AI監視対象外)

**message_threads**

| 列 | 型 | 制約 |
|---|---|---|
| id | uuid | PK |
| created_at | timestamptz | default now() |
| last_message_at | timestamptz | |

**message_thread_participants**

| 列 | 型 | 制約 |
|---|---|---|
| thread_id | uuid | FK→message_threads(id) on delete cascade |
| user_id | uuid | FK→users(id) on delete cascade |
| PK | | (thread_id, user_id) |

- 制約: 参加者は**大人ロールのみ**(teacher/volunteer/community/admin/board/運営)。生徒の参加を禁止(トリガ or チェック関数で `role <> 'student'` を強制)。
- RLS: 本人は自分の参加行を SELECT(`messages` ポリシーの EXISTS 参照が成立するため必須)。INSERT は service role(スレッド作成時)。

**messages**

| 列 | 型 | 制約 |
|---|---|---|
| id | bigint | identity PK |
| thread_id | uuid | FK→message_threads(id) on delete cascade, not null |
| sender_id | uuid | FK→users(id) on delete set null |
| body | text | not null |
| read_at | timestamptz | null |
| created_at | timestamptz | default now() |

- 索引: `index(thread_id, created_at)` / `index(message_thread_participants.user_id)`
- RLS: スレッド参加者のみ SELECT/INSERT。**生徒は参加不可**(RLS と参加トリガで二重に強制)。**AI監視・audit_logs の対象外**(児童が関与しないため。F-NTF-03 のセッション内チャットとは別系統)。

---

## 5. 索引まとめ

| 種別 | 対象 |
|---|---|
| HNSW (vector_cosine_ops) | volunteer_offers.embedding / volunteer_requests.embedding / community_library.embedding |
| GIN (gin_trgm_ops) | volunteer_offers.search_text / community_library.search_text(pg_trgm 部分一致) |
| 外部キー索引 | 各 FK 列(`*_id`、`municipality_code`、`decided_by` / `handled_by`)に作成 |
| 主体索引 | audit_logs(actor_type, actor_id) |
| 部分索引 | chat_messages(ai_checked=false) / notification_logs(status='failed') |
| 一意制約 | schools(workspace_domain) / classroom_courses(teacher_id, google_course_id) / consent_records(token) / block_list(volunteer_id, school_id) where approved / match_offers(request_id, volunteer_id) / volunteer_reviews(session_id) / push_subscriptions(endpoint) / operators(email) |

> embedding の次元 768 は gemini-embedding-2 に固定。モデル変更時は列再定義 + 再インデックスが必要(要件 §9.2)。

---

## 6. RLS 方針と代表ポリシー

### 6.1 ヘルパ(JWT クレーム参照・再帰回避)

```sql
-- ロール（access-token hook で app_metadata.role を付与）
-- 注: Postgres 組込みの current_role と衝突するため app_ プレフィックスにする
create or replace function public.app_current_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- 所属校
create or replace function public.current_school_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'school_id','')::uuid
$$;

-- セッション参加判定
create or replace function public.is_session_participant(sid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from session_participants
    where session_id = sid and user_id = auth.uid()
  )
$$;
```

### 6.2 代表的なポリシー例

```sql
-- users: 本人は自分の行のみ
alter table users enable row level security;
create policy users_self_select on users
  for select using (id = auth.uid());
create policy users_self_update on users
  for update using (id = auth.uid());
create policy users_admin_school_select on users
  for select using (app_current_role() = 'admin' and school_id = current_school_id());

-- chat_messages: 参加者のみ閲覧/投稿、変更・削除は不可
alter table chat_messages enable row level security;
create policy chat_select on chat_messages
  for select using (is_session_participant(session_id));
create policy chat_insert on chat_messages
  for insert with check (is_session_participant(session_id) and sender_id = auth.uid());
-- update/delete ポリシーは作らない＝ユーザーからは不可（service role のみ）

-- messages: 大人スレッド参加者のみ
alter table messages enable row level security;
create policy msg_select on messages
  for select using (exists (
    select 1 from message_thread_participants p
    where p.thread_id = messages.thread_id and p.user_id = auth.uid()));
create policy msg_insert on messages
  for insert with check (sender_id = auth.uid() and exists (
    select 1 from message_thread_participants p
    where p.thread_id = messages.thread_id and p.user_id = auth.uid()));
```

### 6.3 ロール別アクセスの要約

| 対象 | teacher | student | volunteer | community | admin | board | 運営(service) |
|---|---|---|---|---|---|---|---|
| 自分の users 行 | RU | RU | RU | RU | RU | RU | ALL |
| municipalities / schools | R | R | R | R | R | R | ALL |
| operators | - | - | - | - | - | - | ALL(運営ポータル) |
| volunteer_offers | R(候補) | - | 本人ALL | - | R | - | ALL |
| volunteer_requests | 本人ALL | - | R(該当) | - | R(校) | - | ALL |
| match_offers | R(自依頼) | - | 本人R/U | - | R(校) | - | ALL |
| volunteer_sessions | 参加ALL* | 参加R | 参加ALL* | - | R(校) | - | ALL |
| volunteer_reviews | RC(自回) | - | 本人R | - | R(校) | - | ALL |
| chat_messages | 参加RC | 参加RC | 参加RC | - | - | - | ALL |
| community_requests | R/U(校) | - | - | 本人R | R/U(校) | - | ALL |
| community_library | R(校) | - | - | - | R(校) | - | ALL |
| audit_logs | - | - | - | - | R(校) | 集計のみ | INSERT |
| safety_alerts | - | - | - | - | RU(校) | 集計のみ | ALL(発報) |
| block_list | - | - | - | - | RC(校) | - | ALL(審査) |
| consent_records | - | - | - | - | R(校) | - | ALL(token検証) |
| inquiries | 本人R | - | 本人R | 本人R | 本人R | 本人R | ALL |
| notification_prefs / notification_categories / push_subscriptions | 本人ALL | 本人ALL | 本人ALL | 本人ALL | 本人ALL | 本人ALL | ALL |
| messages | 参加RC | **不可** | 参加RC | 参加RC | 参加RC | 参加RC | ALL |

> R=SELECT, U=UPDATE, C=INSERT, ALL=全操作。*印は自分の所定列のみ更新可。(校)=所属校一致。

---

## 7. データ保持・削除・機微情報

- **国内保管**: 全テーブルを Tokyo リージョンに保管。AI 推論は Vertex AI(asia-northeast1)で、チャット原文の永続保管は本DBのみ(要件 §10.3)。
- **監査ログ・録画リンク**: 3年以上保管(録画リンクは対応校のみ・教師が手動登録)。`audit_logs` は追記専用。
- **削除要求(K-03〜K-07)**: 対象 `users` を物理削除 → FK の `on delete cascade`(offers/requests/sessions の本人分・prefs・thread参加)で連鎖削除。`chat_messages.sender_id` / `audit_logs.actor_id` / `notification_logs.user_id` は `set null` で匿名化し、監査の連続性を保つ。
- **機微情報**: `chat_messages` / `consent_records` / `audit_logs` はアプリのAPI経由のみアクセス。`consent_records` は token 検証でのみ書き込み。

### 7.1 外部キーの ON DELETE 方針(DDL で各FKに明示)

| 参照の種類 | ON DELETE | 対象FK(例) |
|---|---|---|
| 親レコード(コンテナ) | CASCADE | match_offers.request_id / volunteer_sessions.request_id / session_participants.* / chat_messages.session_id / volunteer_reviews.session_id / community_library.source_request_id / message_thread_participants.* / messages.thread_id / safety_alerts.session_id |
| ユーザーが所有する業務・設定データ | CASCADE | volunteer_offers.volunteer_id / volunteer_requests.teacher_id / match_offers.volunteer_id / volunteer_sessions.(teacher_id, volunteer_id) / volunteer_reviews.volunteer_id / community_requests.community_id / classroom_courses.teacher_id / consent_records.student_id / safety_alerts.volunteer_id / notification_prefs.user_id / notification_categories.user_id / push_subscriptions.user_id |
| 監査・履歴・ログの主体 | SET NULL | chat_messages.sender_id / audit_logs.session_id / notification_logs.user_id / messages.sender_id / inquiries.user_id / classroom_courses.linked_session_id / block_list.requested_by(申請者が消えてもブロックは残す) / safety_alerts.chat_message_id / safety_alerts.handled_by |
| 運営(operators)参照 | SET NULL | block_list.decided_by / inquiries.handled_by |
| マスタ参照(削除しない前提) | RESTRICT | schools.municipality_code / users.municipality_code / *.school_id(not null) / *.target_school_id |
| nullable なマスタ参照 | SET NULL | users.school_id |

> `audit_logs.actor_id` は FK を張らない(actor_type で多種主体を記録)。削除要求時は `actor_type='user'` の行を null 化(§7 / §9.3)。

---

## 8. テーブル↔フロー対応(トレーサビリティ)

| テーブル | 主な読み書きフロー | 関連要件 |
|---|---|---|
| municipalities | （マスタ投入） | §2 自治体スコープ |
| schools | B-08(ドメイン照合) | F-AUTH-03 |
| users | B-17 / A-04 | F-AUTH-02〜05 |
| operators | B-15 / I-04 / L-09 | F-AUTH-06(別管理の運営) |
| volunteer_offers | C-09 / D-07 | F-VOL-01, 03 |
| volunteer_requests | D-05 / D-07 | F-VOL-02, 03 |
| match_offers | D-12 / D-13 | F-VOL-04, 05 |
| volunteer_sessions | D-14 / E-13〜16 | F-VOL-06 / F-SES-05〜07 |
| session_participants | D-14 / E-07 | F-SES-02 |
| volunteer_reviews | E-16 | F-VOL-07 |
| community_requests | F-05 / F-09 | F-COM-01〜04 |
| community_library | F-11 / F-12 | F-COM-05, 06 |
| classroom_courses | G-05 / G-06 | F-GC-01, 02 |
| chat_messages | E-10 / H-02 | F-NTF-03, F-AI-01 |
| audit_logs | H-10 / K-09 | F-AI-04, §10.3 |
| safety_alerts | H-05 / H-07 / H-09 | F-AI-02, 03 |
| block_list | I-06 / I-07 | F-AI-05 |
| consent_records | K-14 | F-AUTH-07, §10.4 |
| notification_prefs | J-03 | F-NTF-04 |
| notification_categories | J-03 / J-04 | F-NTF-04 |
| push_subscriptions | J-08 / J-09 | F-NTF-02 |
| notification_logs | J-10 / J-11a | F-NTF-01, 02 |
| inquiries | L-06 / L-11 | F-INQ-01〜04 |
| message_threads / messages | N-05 / N-06 | F-MSG-01〜03 |

---

## 9. 正規化(3NF)に関する整理

### 9.1 中間(関連)テーブル

M:N および属性付きの関連は専用の関連表で表現する:

- **session_participants**(volunteer_sessions × users)— 参加者と役割
- **message_thread_participants**(message_threads × users)— スレッド参加者
- **notification_categories**(users × カテゴリ)— カテゴリ別通知設定
- **match_offers**(volunteer_requests × users(V))— 打診と応答(status/期限の属性付き関連)

### 9.2 3NF準拠の状況

基本構造は第3正規形。今回の見直しで、検出した推移的従属・繰り返し列を解消した:

- `schools.prefecture`(`municipality_code → prefecture` の推移的従属)→ **municipalities マスタ**へ分離
- `users.municipality_code`(学校所属ロールは school 経由で導出可能)→ **教委のみ保持**に限定
- `notification_prefs.categories`(jsonb の繰り返しグループ=1NF違反)→ **notification_categories** へ行展開

### 9.3 意図的な非正規化(性能・監査・履歴のための例外)

3NF からの逸脱は次に限定し、トリガ等で整合を保証する:

| 箇所 | 種類 | 理由 | 整合の担保 |
|---|---|---|---|
| users.rating_avg / session_count | 集計の冗長保持 | 候補一覧(D-10)の読み取り高速化 | volunteer_reviews 挿入トリガ |
| volunteer_sessions.teacher_id / school_id | 導出値の保持 | RLS所属校スコープで requests を結合しない | 生成時に確定(以後不変) |
| community_library.school_id | 導出値の保持 | RLS所属校スコープ | 受入時に確定 |
| safety_alerts.school_id | 導出値の保持 | RLS所属校スコープ | 発報時に確定 |
| users.email | auth.users のミラー | クエリ簡便化 | 認証側更新時に同期 |
| audit_logs.detail / consent_records.consent_items | jsonb スナップショット | ログ/法的同意の時点記録(可変スキーマ) | 追記専用・不変 |
| audit_logs.actor_id(非FK + actor_type) | ポリモーフィック関連 | user/operator/parent/system/ai を1列で記録・削除耐性 | 追記専用・不変 |

> jsonb を残すのは「ログ」と「時点スナップショット」のみ。業務マスタ/トランザクションの関係データには使わない。

## 10. マイグレーション運用

- スキーマ定義は **Drizzle**(`drizzle/schema.ts`)で TypeScript 管理し、`drizzle-kit` でマイグレーション生成。
- **enum・拡張・RLS ポリシー・トリガ・ヘルパ関数は drizzle-kit が完全には扱えない**ため、これらは番号付き SQL マイグレーション(`drizzle/migrations/NNNN_*.sql`)で明示管理し、Drizzle の生成物と同じディレクトリで版管理する。
- 適用順序: 拡張 → enum → テーブル → 索引 → ヘルパ関数 → RLS 有効化 + ポリシー → トリガ(updated_at / 参加者ロール検証 / V実績集計)。
- access-token hook(`app_metadata` への role/school 付与)は Supabase 側設定としてリポジトリに手順を残す。

---

**以上**

- 本設計は業務フロー図 v2.10(§8 データモデル概要)および要件定義書 v1.9 に基づく
- 全 26 テーブル(マスタ 4 / 設定・購読 3 / キャッシュ 1 / トランザクション 16 / ログ・監査 2)。うち `classroom_courses` は初期リリース対象外(F-GC後送)のため、初期DDLは実質 25 テーブル
- 要件 §8 の主要16テーブルに加え、municipalities / operators / match_offers / volunteer_reviews / safety_alerts / notification_categories / push_subscriptions / session_participants / message_threads / message_thread_participants を定義
- アクターの種別は `actor_type`(user/operator/parent/system/ai)で一元化(§1.4)
