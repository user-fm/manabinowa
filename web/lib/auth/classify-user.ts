// OAuth ログイン後のユーザー区分判定ロジック。
// ログインしたメールアドレスのドメインを見て、学校の Workspace ドメイン
// (schools.workspace_domain)に一致すれば「校内ユーザー」、それ以外
// (個人 Gmail など)は「個人ユーザー」として分類する。
//
// この分類は、オンボーディングで選べるロールを振り分けるための土台になる:
//   校内ユーザー → teacher / student / admin / board(学校・機関系ロール)
//   個人ユーザー → volunteer / community(運営審査を経る外部人材)
// ルーティング(どの URL を表示するか)は "/" ハブ側(app/page.tsx)が
// ロールを見て担当するため、本ファイルの責務外。

import { createAdminClient } from "@/lib/supabase/admin";

// public.users.role(user_role enum)に対応するロール。
export type AppRole = "teacher" | "student" | "volunteer" | "community" | "admin" | "board";

// 校内(学校 Workspace ドメイン)ユーザーが選べるロール。
export const SCHOOL_ROLES = ["teacher", "student", "admin", "board"] as const satisfies readonly AppRole[];
// 個人(個人 Gmail 等)ユーザーが選べるロール。運営審査前提(account_status=pending)。
export const PERSONAL_ROLES = ["volunteer", "community"] as const satisfies readonly AppRole[];

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
 *   RLS をバイパスできる service role の admin クライアントで照会する
 *   (認証フロー全体が createAdminClient に統一されているのに合わせる)。
 */
export async function classifyUserByEmail(
  email: string | null | undefined,
): Promise<UserClassification> {
  const domain = extractEmailDomain(email);
  if (!domain) {
    return { kind: "personal", domain: "" };
  }

  const admin = createAdminClient();
  // workspace_domain は DB 側で小文字保証が無い(text unique のみ)。大文字混じりで
  // 登録されていても取りこぼさないよう、ilike で大小無視のマッチを取り、JS 側でも
  // 小文字化して厳密照合する(ilike の "_"/"%" ワイルドカード誤マッチを防ぐ二重チェック。
  // ilike は複数行を返し得るため maybeSingle は使わず find で拾う)。
  const { data: rows } = await admin
    .from("schools")
    .select("id, name, workspace_domain")
    .ilike("workspace_domain", domain);

  const matched = (rows ?? []).find((s) => s.workspace_domain?.toLowerCase() === domain);

  if (matched?.workspace_domain) {
    return {
      kind: "school",
      domain,
      school: {
        id: matched.id,
        name: matched.name,
        workspaceDomain: matched.workspace_domain,
      },
    };
  }

  return { kind: "personal", domain };
}

/**
 * 分類結果から、そのユーザーがオンボーディングで選べるロール一覧を返す。
 * 校内 → 学校・機関系ロール、個人 → 外部人材ロール。
 */
export function allowedRolesFor(classification: UserClassification): readonly AppRole[] {
  return classification.kind === "school" ? SCHOOL_ROLES : PERSONAL_ROLES;
}

/**
 * 指定ロールがその分類で選択可能かを判定する(サーバー側の検証用)。
 * クライアントの改ざんに備え、public.users への書き込み前に必ず通すこと。
 */
export function isRoleAllowedFor(
  role: string,
  classification: UserClassification,
): role is AppRole {
  return (allowedRolesFor(classification) as readonly string[]).includes(role);
}
