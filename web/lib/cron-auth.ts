// 外部の定期実行(cron)から叩くエンドポイントの共通認証。
// 共有シークレットを Authorization: Bearer <secret> で受け取る。

import { timingSafeEqual } from "node:crypto";

/** トークン比較は長さの違いも含めて一定時間で行う */
export function isAuthorizedCron(request: Request, secret: string): boolean {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
