import { defineConfig } from "drizzle-kit";

// enum / RLS / トリガ / ヘルパ関数は drizzle-kit で扱いきれないため、
// 初期スキーマは db/migrations/0000_init.sql(設計書 manabi-no-wa-database.md 由来)を直接適用する。
// 型安全な Drizzle スキーマ(lib/schema.ts)は、DB 構築後に `pnpm db:pull` で生成する。
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // RLS を有効化した Supabase 環境向け
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
