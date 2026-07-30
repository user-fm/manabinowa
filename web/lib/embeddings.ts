// D-06: Gemini Embeddings による意味ベクトル生成。
// DB 側は vector(768)(0000_init.sql)なので 768 次元に固定する。
// GEMINI_API_KEY が未設定の環境では null を返し、呼び出し側は
// 教科・学年の条件マッチ(lib/matching.ts)にフォールバックする。

const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;

/** 検索対象(ボランティアのスキル)か、検索クエリ(学校の依頼)か */
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function isEmbeddingEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * テキストを 768 次元ベクトルにする。
 * API キー未設定・API 失敗時は null(呼び出し側でフォールバック)。
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const input = text.trim();
  if (!input) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text: input }] },
        taskType,
        outputDimensionality: DIMENSIONS,
      }),
    });
    if (!res.ok) {
      // 応答本文にキーは含まれないが、念のため本文はそのまま出さずステータスのみ記録する
      console.error("埋め込み生成失敗", res.status, res.statusText);
      return null;
    }
    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const values = json.embedding?.values;
    if (!values || values.length !== DIMENSIONS) {
      console.error("埋め込み生成失敗: 次元数が不正", values?.length);
      return null;
    }
    return normalize(values);
  } catch (error) {
    console.error("埋め込み生成失敗", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * 768 次元に切り詰めた出力は正規化されていないため、
 * コサイン距離(<=>)が正しく働くよう L2 正規化する。
 */
function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (!norm || !Number.isFinite(norm)) return values;
  return values.map((v) => v / norm);
}

/** pgvector のリテラル表記("[0.1,0.2,...]")。RPC 引数に渡す形式。 */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
