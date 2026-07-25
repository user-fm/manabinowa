// Dフロー D-06〜D-09 のマッチング処理。
// D-06 Gemini ベクトル化 → D-07 pgvector 類似検索 → D-08 候補有無判定 →
// D-09 候補ゼロなら教師へ条件再調整を促すメール。
// 埋め込みが使えない環境(GEMINI_API_KEY 未設定)では、DB 関数側が
// 教科・学年の条件一致にフォールバックする(0004_matching.sql)。

import { generateEmbedding, toVectorLiteral } from "@/lib/embeddings";
import { sendEmailNotification } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/** D-07 の類似度閾値(フローチャート注記: 0.75、調整可) */
export const MATCH_THRESHOLD = 0.75;
/** D-07 で取得する候補の上限件数 */
export const MATCH_LIMIT = 10;
/** D-13 のボランティア承諾期限(48時間) */
export const OFFER_EXPIRY_HOURS = 48;

export type Candidate = {
  volunteerId: string;
  offerId: string;
  fullName: string;
  subjects: string[];
  grades: string[];
  availability: string | null;
  intro: string | null;
  ratingAvg: number | null;
  sessionCount: number;
  score: number;
  matchType: "vector" | "keyword";
};

type CandidateRow = {
  volunteer_id: string;
  offer_id: string;
  full_name: string;
  subjects: string[] | null;
  grades: string[] | null;
  availability: string | null;
  intro: string | null;
  rating_avg: number | string | null;
  session_count: number;
  score: number;
  match_type: string;
};

/** 依頼の検索用テキスト(埋め込みの入力) */
export function buildRequestSearchText(input: {
  subject: string;
  grade: string;
  detail: string;
}): string {
  return `教科: ${input.subject}\n学年: ${input.grade}\n依頼内容: ${input.detail}`;
}

/** ボランティアスキルの検索用テキスト(埋め込みの入力) */
export function buildOfferSearchText(input: {
  subjects: string[];
  grades: string[];
  availability?: string | null;
  intro?: string | null;
}): string {
  return [
    `対応教科: ${input.subjects.join("、")}`,
    `対応学年: ${input.grades.join("、")}`,
    input.availability ? `対応可能な時間帯: ${input.availability}` : null,
    input.intro ? `自己紹介: ${input.intro}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * D-06: 依頼の search_text / embedding を生成して保存する。
 * 埋め込みが得られない場合も search_text は保存する(キーワード検索の材料)。
 */
export async function refreshRequestEmbedding(requestId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("subject, grade, detail")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return;

  const searchText = buildRequestSearchText(request);
  const vector = await generateEmbedding(searchText, "RETRIEVAL_QUERY");

  const { error } = await admin
    .from("volunteer_requests")
    .update({
      search_text: searchText,
      ...(vector ? { embedding: toVectorLiteral(vector) } : {}),
    })
    .eq("id", requestId);
  if (error) console.error("依頼ベクトル化失敗", error.message);
}

/**
 * ボランティアスキル(volunteer_offers)の search_text / embedding を保存する。
 * 依頼側と同じ空間に載せるため、D-06 と同じモデルを使う。
 */
export async function refreshOfferEmbedding(offerId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("volunteer_offers")
    .select("subjects, grades, availability, intro")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return;

  const searchText = buildOfferSearchText({
    subjects: offer.subjects ?? [],
    grades: offer.grades ?? [],
    availability: offer.availability,
    intro: offer.intro,
  });
  const vector = await generateEmbedding(searchText, "RETRIEVAL_DOCUMENT");

  const { error } = await admin
    .from("volunteer_offers")
    .update({
      search_text: searchText,
      ...(vector ? { embedding: toVectorLiteral(vector) } : {}),
    })
    .eq("id", offerId);
  if (error) console.error("スキルベクトル化失敗", error.message);
}

/**
 * D-07: 依頼に対するマッチング候補を取得する。
 * 依頼側の embedding が無ければ null を渡し、DB 関数側で条件一致に切り替える。
 */
export async function findCandidates(
  requestId: string,
  limit: number = MATCH_LIMIT,
): Promise<Candidate[]> {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("embedding")
    .eq("id", requestId)
    .maybeSingle();

  const embedding = normalizeEmbedding(request?.embedding);

  const { data, error } = await admin.rpc("match_volunteer_candidates", {
    p_request_id: requestId,
    p_embedding: embedding,
    p_threshold: MATCH_THRESHOLD,
    p_limit: limit,
  });
  if (error) {
    console.error("候補検索失敗", error.message);
    return [];
  }

  return ((data ?? []) as CandidateRow[]).map((row) => ({
    volunteerId: row.volunteer_id,
    offerId: row.offer_id,
    fullName: row.full_name,
    subjects: row.subjects ?? [],
    grades: row.grades ?? [],
    availability: row.availability,
    intro: row.intro,
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    sessionCount: row.session_count,
    score: row.score,
    matchType: row.match_type === "vector" ? "vector" : "keyword",
  }));
}

/**
 * D-06〜D-09: 依頼保存直後の一連の処理。
 * ベクトル化 → 候補検索 → 候補ゼロなら教師へ条件再調整を促すメール(D-09)。
 * 通知やAIの失敗で依頼作成自体は失敗させない。
 */
export async function runMatching(requestId: string): Promise<Candidate[]> {
  await refreshRequestEmbedding(requestId);
  const candidates = await findCandidates(requestId);
  if (candidates.length > 0) return candidates;

  // D-09: 候補なし
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("volunteer_requests")
    .select("id, teacher_id, subject, grade")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return candidates;

  await sendEmailNotification({
    userId: request.teacher_id,
    category: "matching",
    subject: "【まなびのわ】条件に合うボランティアが見つかりませんでした",
    body: [
      `「${request.subject}（${request.grade}）」のご依頼について、`,
      "現時点で条件に合うボランティアが見つかりませんでした。",
      "",
      "教科・学年・希望日時の条件を広げていただくと、見つかる可能性が高まります。",
      "依頼の詳細画面から条件を見直してください。",
    ].join("\n"),
  });

  return candidates;
}

/** D-13: 期限切れの提示を expired にする(一覧表示前の状態最新化) */
export async function expireStaleOffers(): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("expire_match_offers");
  if (error) console.error("提示の期限切れ更新失敗", error.message);
}

/** 承諾期限(48時間後)の ISO 文字列 */
export function offerExpiryFromNow(): string {
  return new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * PostgREST から返る embedding は文字列("[0.1,...]")か配列のことがある。
 * RPC 引数にはリテラル文字列で渡す。
 */
function normalizeEmbedding(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("[")) return value;
  if (Array.isArray(value) && value.length > 0) return toVectorLiteral(value as number[]);
  return null;
}
