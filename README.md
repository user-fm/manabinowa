# まなびのわ

> 途切れない、学びのサイクル

公立小中学校とボランティア・地域をつなぐ、学習支援マッチングプラットフォームです。
U-22 プログラミング・コンテスト応募作品。

## 背景と課題

教員の多忙化により、個別の学習支援に手が回らない状況が続いています。
一方で、支援したい社会人・学生・地域住民はいるものの、学校と個人が安全につながる経路がありません。

外部の大人と児童生徒を直接つなぐことには、当然リスクが伴います。
**「つなぐ」ことと「守る」ことを同時に成立させる**ことが、このプロダクトの中心的な課題です。

## 特徴

### AI による意味検索マッチング

依頼内容とボランティアのスキルを Gemini で 768 次元ベクトル化し、pgvector で類似検索します。
「数学が苦手な子のフォロー」のような曖昧な依頼でも、教科名の完全一致に頼らず候補を提示できます。
ベクトル生成に失敗した場合はキーワード一致（pg_trgm）へ自動フォールバックします。

### AI によるチャット安全監視

セッション内のチャットを Gemini が文脈解析し、不適切な兆候をリスク4段階（低・中・高・緊急）で判定します。

- 緊急と判定された場合、**セッションを自動で一時停止**します
- 中・高リスクは学校管理者へ即時アラートを送信します
- 全判定を監査ログに記録します

判定は送信処理をブロックせず、`after()` で応答後に非同期実行されるため、チャットの体感速度に影響しません。

### 申請と承認の分離

学校管理者はボランティアのブロックを**申請**できますが、**承認はできません**。
承認は運営が事後審査する設計とし、学校側による恣意的な排除を防いでいます。
承認されたボランティアは、以後マッチング候補から自動的に除外されます。

## 技術構成

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16.2.9（App Router / Server Components / Server Actions） |
| 言語 | TypeScript 5 / React 19.2.4 |
| データベース | Supabase (PostgreSQL, 東京リージョン) + Row Level Security |
| ORM | Drizzle ORM |
| 拡張 | pgvector（意味検索）/ pg_trgm（日本語部分一致） |
| AI | Gemini API（`gemini-2.5-flash` 解析・`gemini-embedding-001` ベクトル化） |
| 認証 | Supabase Auth + Google OAuth 2.0 |
| スタイル | Tailwind CSS v4 |
| メール | Resend |
| Lint / Format | Biome |
| ホスティング | Vercel |

データは東京リージョンに保管しています。

### 設計上の要点

- **RLS を全テーブルで有効化**し、参加者判定を `security definer` 関数に切り出して再帰を回避しています
- **監査ログは追記専用**。ユーザー削除時も `actor_id` を `null` 化して匿名化し、監査の連続性を保ちます
- チャットの `UPDATE` / `DELETE` ポリシーは意図的に作成していません（監査保全のため）

## ロール

| ロール | 説明 | アカウント |
|---|---|---|
| 教師 | ボランティアへの依頼、地域依頼の選定 | 学校 Google Workspace |
| 生徒 | 指導を受ける | 学校 Google Workspace |
| ボランティア | 学習・部活動支援 | 個人 Gmail（運営審査あり） |
| 地域 | 学校への依頼（ポスター制作・行事参加など） | 個人 Gmail（運営審査あり） |
| 学校管理者 | アラート対応、ブロック申請 | 学校 Google Workspace |
| 教育委員会 | 統計・監査レポート閲覧 | 学校 Google Workspace |

学校ドメインのアカウントは所属校に自動で紐付き、個人 Gmail は運営審査を経て有効化されます。
未成年の登録には保護者の電子署名による同意を必要とする設計です。

## セットアップ

### 必要なもの

- Node.js 22 LTS
- pnpm 11
- Supabase プロジェクト（東京リージョン推奨）

### 手順

```bash
git clone https://github.com/user-fm/manabinowa.git
cd manabinowa/web
pnpm install
cp .env.example .env.local   # 値を設定
```

`web/db/migrations/` の SQL を番号順に Supabase へ適用します。

```bash
pnpm dev     # http://localhost:3000
```

### 環境変数

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側からの DB 操作用 |
| `DATABASE_URL` | Drizzle のマイグレーション接続先 |
| `GEMINI_API_KEY` | チャット解析・ベクトル化 |
| `GEMINI_MODEL` | 解析モデル（既定 `gemini-2.5-flash`） |
| `RESEND_API_KEY` | メール通知 |
| `MAIL_FROM` | 送信元アドレス |
| `CRON_SECRET` / `MODERATION_CRON_SECRET` | 定期実行エンドポイントの保護 |

### コマンド

```bash
pnpm dev            # 開発サーバー
pnpm build          # 本番ビルド
pnpm lint           # Biome チェック
pnpm format         # Biome 整形
pnpm db:generate    # Drizzle スキーマからマイグレーション生成
pnpm db:migrate     # マイグレーション適用
```

## 実装状況

コンテスト応募時点の状態です。

### 実装済み

- Google OAuth による認証と6ロールのオンボーディング（学校ドメイン判定・個人 Gmail 審査）
- ボランティアのスキル登録
- 依頼の作成、AI 意味検索によるマッチング、打診と承諾・辞退
- セッションの入室・進行・終了
- セッション内チャット（Supabase Realtime）
- Gemini によるチャット監視、リスク判定、アラート発報、緊急時のセッション自動停止
- 学校管理者のアラート対応とブロック申請
- 地域からの依頼作成と教師による選定
- 振り返り入力、録画リンク登録、ボランティア評価
- お問い合わせフォーム
- メール通知（Resend）

### 今回のスコープ外

- Google Meet 連携（会議 URL 自動発行）
- Google Classroom 連携（コース・名簿同期）

### 未実装

- ロール間メッセージの送信・スレッド詳細（一覧表示のみ）
- ホワイトボード共有（Excalidraw）
- AI による指導内容の自動要約
- 運営者向け画面（ブロック承認・問い合わせ対応）
- Web Push 通知、通知設定
- 教育委員会向けの統計・監査レポート

## ディレクトリ

```
web/
├─ app/              App Router（ページ・Server Actions・API）
├─ components/ui/    共通 UI コンポーネント
├─ lib/              認証・マッチング・AI 監視・通知
│  ├─ matching.ts    D: 意味検索マッチング
│  ├─ moderation.ts  H: Gemini 文脈解析
│  ├─ safety.ts      H: リスク判定・アラート
│  └─ embeddings.ts  ベクトル化（768次元）
├─ db/migrations/    SQL マイグレーション
└─ middleware.ts     セッション更新

project-plan/        要件定義・DB 設計・フロー図
```

## ライセンス

未定
