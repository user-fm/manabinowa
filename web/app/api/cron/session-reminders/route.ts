import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { sendSessionReminders } from "@/lib/sessions";

// E-05: 24時間以内のセッションへリマインドを送る定期処理。
// 外部の定期実行から Authorization: Bearer <CRON_SECRET> で叩く(1時間ごと想定)。

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  // 秘密鍵が未設定の環境では誰でも実行できてしまうため、機能自体を無効にする。
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET が未設定です" }, { status: 503 });
  }
  if (!isAuthorizedCron(request, secret)) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const sent = await sendSessionReminders();
  return NextResponse.json({ sent });
}
