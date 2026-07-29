import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { moderatePendingMessages } from "@/lib/safety";

// H-02: 未検査メッセージの一括検査。送信時の並列起動(E-11)が失敗した分を回収する。
// 外部の定期実行(cron)から Authorization: Bearer <MODERATION_CRON_SECRET> で叩く。
// 1回で処理しきれない分は timedOut: true を返す(残りは次回の実行で処理される)。

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.MODERATION_CRON_SECRET;
  // 秘密鍵が未設定の環境では誰でも実行できてしまうため、機能自体を無効にする。
  if (!secret) {
    return NextResponse.json({ error: "MODERATION_CRON_SECRET が未設定です" }, { status: 503 });
  }
  if (!isAuthorizedCron(request, secret)) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const { checked, timedOut } = await moderatePendingMessages();
  return NextResponse.json({ checked, timedOut });
}
