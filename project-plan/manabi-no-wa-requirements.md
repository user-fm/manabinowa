# 「まなびのわ」要件定義書

**プロジェクト名**: まなびのわ (Manabi no Wa)
**コンセプト**: 途切れない、学びのサイクル
**バージョン**: 1.9
**作成日**: 2026年5月23日
**更新日**: 2026年6月16日(機能要件 §4 を業務フロー図 §0.3 へ統合。本書は §5 非機能・§7 アーキ・§15 用語・§16 付録)

---

> **構成について:** 企画・背景・運用面(§1〜3 概要/ステークホルダー/サービス2軸、§10〜14 セキュリティ/開発計画/収益/リスク/将来展望)は別紙 **`manabi-no-wa-overview.md`(企画内容)** に分離した。本書は §5 非機能要件・§7 アーキテクチャ・§15 用語集・§16 付録を扱う(§4 機能要件は業務フロー図 §0.3、§6・§8・§9 は業務フロー図付録へ移設)。**章番号は分離後も元番号を維持**(相互参照の互換のため)。

---

> **機能要件の所在:** 機能要件(旧 §4)は **業務フロー図ファイル `manabi-no-wa-flowchart-v2.md` §0.3「機能要件・カバレッジ表」**に統合した(全46件を フロー・主要工程ID とともに一覧化)。

---

## 5. 非機能要件

### 5.1 パフォーマンス

- 主要ページの LCP 2.5秒以内
- INP 200ms以内
- API応答時間 95%ile 500ms以内

### 5.2 可用性

- サービス稼働率 99.5%以上
- 計画停止は事前通知し、土日深夜に実施

### 5.3 スケーラビリティ

- 初期は数十校、最大数千校までスケール可能な構成
- 同時オンライン指導セッション数 1000以上に対応

### 5.4 セキュリティ

- HTTPS 必須(Let's Encrypt / Vercel自動管理)
- Row Level Security による厳格なアクセス制御
- 個人情報保護法準拠
- 学校DXガイドライン(文部科学省)準拠
- データは日本国内(Tokyo region)に保管
- 機微情報の暗号化保存

### 5.5 ユーザビリティ

- 子どもでも直感的に使えるUI
- Chromebook、タブレット、スマートフォン対応
- インストール不要のPWAとして動作
- 主要ブラウザ(Chrome、Safari、Edge、Firefox)の最新2バージョン対応

### 5.6 保守性

- TypeScriptによる型安全性
- 単体テスト(Vitest)・E2Eテスト(Playwright)の自動化
- エラー追跡(Sentry)による迅速な問題対応
- CI/CD による継続的デリバリ

---

> **技術リファレンスの所在:** 技術スタック(§6)・データモデル概要(§8)・外部サービス連携(§9)は**表形式で業務フロー図ファイル `manabi-no-wa-flowchart-v2.md` の付録**へ移設した(章番号は維持)。本書はアーキテクチャ(§7)以降の仕様を扱う。

---

## 7. システムアーキテクチャ

```
┌────────────────────────────────────────────────────────┐
│  ブラウザ (PWA)                                         │
│  ├ 教師 / 生徒 / 学校管理者 / 教育委員会                 │
│  │   : 学校Workspaceアカウント                          │
│  ├ ボランティア      : 個人Gmail                        │
│  ├ 地域住民・団体    : 個人Gmail                        │
│  ├ サービス運営者    : 管理者用アカウント                │
│  └ 保護者(同意のみ): アカウント不要(メールリンク経由) │
└────────────────────┬───────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼───────────────────────────────────┐
│  Vercel (Next.js 16.2 + React 19.2)                    │
│  ├ Server Components (DB読み取り)                       │
│  ├ Server Actions (書き込み)                            │
│  ├ Cache Components (use cache)                        │
│  ├ React Compiler (自動メモ化)                          │
│  ├ middleware.ts (認証・セッション更新)                 │
│  └ Sentry instrumentation                              │
└──────┬───────┬─────────┬──────────┬────────────────────┘
       │       │         │          │
┌──────▼──┐ ┌──▼────┐ ┌──▼─────┐ ┌──▼──────┐
│Supabase │ │Google │ │VertexAI│ │ Resend  │
│Auth+DB  │ │APIs   │ │ 東京   │ │ Mail    │
│Storage  │ │       │ │3.5Flash│ └─────────┘
│Realtime │ │Class- │ │+embed-2│
│Queues   │ │room   │ └────────┘
│pgvector │ │Cal.   │
│pg_trgm  │ │Drive  │
│pgmq     │ │Meet   │
└─────────┘ └───────┘

※ Drizzle はアプリ側ORM(Supabaseの構成要素ではない)。DBアクセスは Node ランタイムで実行。
```

**図中の補足:**

- 8ロールの認証経路(学校Workspace=同一OAuth / 個人Gmail=別審査 / 運営=admin URL / 保護者=メールリンク)の詳細は §4.1 および別紙 overview §2 を参照。
- AI は Vertex AI(東京)で `gemini-3.5-flash`(解析・要約・検知)と `gemini-embedding-2`(768次元・検索)を併用(§9.2、§10.3)。
- 通知メール・保護者同意リンクは Vercel → Resend 経由で配信(§9.3)。

---

## 15. 用語集

| 用語 | 意味 |
|---|---|
| PWA | Progressive Web App。インストール不要でアプリのように動作するWeb |
| RLS | Row Level Security。データベース行単位のアクセス制御 |
| RSC | React Server Components。サーバー側でレンダリングするReactコンポーネント |
| OAuth | 認証・認可の標準プロトコル |
| GA | General Availability。一般提供開始 |
| LTS | Long Term Support。長期サポート版 |
| FTS | Full Text Search。全文検索 |
| pgvector | PostgreSQL のベクトル検索拡張 |
| pg_trgm | PostgreSQL のトライグラム部分一致検索拡張(日本語キーワード検索の補助) |
| pgmq | PostgreSQL のメッセージキュー拡張 |

---

## 16. 付録: package.json 主要部

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@supabase/supabase-js": "^2.46.0",
    "@supabase/ssr": "^0.6.0",
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.5",
    "zod": "^4.0.0",
    "@google/genai": "^1.0.0",
    "googleapis": "^155.0.0",
    "google-auth-library": "^10.1.0",
    "@sentry/nextjs": "^9.0.0",
    "resend": "^4.0.0",
    "@react-email/components": "^0.0.31",
    "@excalidraw/excalidraw": "^0.18.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.0",
    "lucide-react": "^0.520.0",
    "next-themes": "^0.4.4",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^5.1.0",
    "serwist": "^9.0.11",
    "@serwist/next": "^9.0.11",
    "date-fns": "^4.1.0",
    "nanoid": "^5.0.9"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@types/node": "^22.10.1",
    "drizzle-kit": "^0.31.0",
    "@biomejs/biome": "^2.4.0",
    "vitest": "^4.1.6",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/browser-playwright": "^4.1.6",
    "@testing-library/react": "^16.1.0",
    "@testing-library/dom": "^10.4.0",
    "jsdom": "^25.0.1",
    "@playwright/test": "^1.49.1",
    "react-email": "^3.0.4",
    "babel-plugin-react-compiler": "^1.0.0"
  }
}
```

---

**以上**
