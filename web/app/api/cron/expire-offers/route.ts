import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { expireStaleOffers } from "@/lib/matching";

// D-13: 承諾期限(48時間)を過ぎた提示を expired にする定期処理。
// match_offers 全体への更新になるため、画面表示からではなくここから実行する。
// 外部の定期実行から Authorization: Bearer <CRON_SECRET> で叩く。

export const maxDuration = 30;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  // 秘密鍵が未設定の環境では誰でも実行できてしまうため、機能自体を無効にする。
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET が未設定です" }, { status: 503 });
  }
  if (!isAuthorizedCron(request, secret)) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const expired = await expireStaleOffers();
  return NextResponse.json({ expired });
}
