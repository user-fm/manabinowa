import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Drizzle + postgres.js(TCP接続=Node ランタイム専用。Edge では使わない)。
// 用途: マイグレーション・バッチ・信頼ジョブ(service role 相当)。
// ユーザー文脈の読み書きは RLS を効かせるため lib/supabase 経由を使うこと(設計書 §6.2)。
const connectionString = process.env.DATABASE_URL ?? "";

// 開発時のホットリロードで接続が増殖しないように使い回す
const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
};

const client = globalForDb.pg ?? postgres(connectionString, { prepare: false, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client);
