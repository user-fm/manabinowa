import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { moderatePendingMessages } from "@/lib/safety";

// H-02: 未検査メッセージの一括検査。送信時の並列起動(E-11)が失敗した分を回収する。
// 外部の定期実行(cron)から Authorization: Bearer <MODERATION_CRON_SECRET> で叩く。

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.MODERATION_CRON_SECRET;
  // 秘密鍵が未設定の環境では誰でも実行できてしまうため、機能自体を無効にする。
  if (!secret) {
    return NextResponse.json({ error: "MODERATION_CRON_SECRET が未設定です" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (!isValidToken(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const checked = await moderatePendingMessages();
  return NextResponse.json({ checked });
}

/** トークン比較は長さの違いも含めて一定時間で行う */
function isValidToken(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
