// OAuth ログイン後のユーザー区分判定ロジック。
// ログインしたメールアドレスのドメインを見て、学校の Workspace ドメイン
// (schools.workspace_domain)に一致すれば「校内ユーザー」、それ以外
// (個人 Gmail など)は「個人ユーザー」として分類する。
//
// 注: ルーティング(分類結果をどの URL へ流すか)は本ファイルの責務外。
//     ここでは「どちらのユーザーか」を返すところまでを担当する。

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/schema";

// 判定結果。校内ユーザーの場合は一致した学校情報を併せて返す。
export type UserClassification =
  | {
      kind: "school";
      domain: string;
      school: { id: string; name: string; workspaceDomain: string };
    }
  | { kind: "personal"; domain: string };

/**
 * メールアドレスからドメイン部分を取り出す純粋関数(DB アクセスなし)。
 * - 前後の空白を除去し、小文字へ正規化する(ドメインは大小無視)。
 * - "@" を含まない / ローカル部やドメイン部が空 の場合は null を返す。
 * - "@" が複数ある場合は最後の "@" 以降をドメインとして扱う。
 */
export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return null; // "@" が無い、または先頭が "@"(ローカル部が空)
  const domain = normalized.slice(atIndex + 1);
  return domain.length > 0 ? domain : null;
}

/**
 * メールアドレスのドメインを学校の Workspace ドメインと突き合わせ、
 * 校内ユーザーか個人ユーザーかを判定する。
 *
 * @param email ログイン済みユーザーのメールアドレス
 * @returns 校内 = { kind: "school", school }, 個人 = { kind: "personal" }
 *
 * 備考:
 * - ドメインを取り出せない不正なメールは「個人ユーザー」として扱う
 *   (校内権限を誤って付与しないための安全側のフォールバック)。
 * - schools 参照はログイン直後(ユーザーレコード作成前)に走るため、
 *   RLS をバイパスできる信頼ジョブ用の drizzle 接続(lib/db)で照会する。
 */
export async function classifyUserByEmail(
  email: string | null | undefined,
): Promise<UserClassification> {
  const domain = extractEmailDomain(email);
  if (!domain) {
    return { kind: "personal", domain: "" };
  }

  const [matched] = await db
    .select({
      id: schools.id,
      name: schools.name,
      workspaceDomain: schools.workspaceDomain,
    })
    .from(schools)
    .where(eq(schools.workspaceDomain, domain))
    .limit(1);

  if (matched?.workspaceDomain) {
    return {
      kind: "school",
      domain,
      school: {
        id: matched.id,
        name: matched.name,
        workspaceDomain: matched.workspaceDomain,
      },
    };
  }

  return { kind: "personal", domain };
}
