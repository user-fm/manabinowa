// H-03〜H-05: チャットの文脈解析と不適切兆候・リスクレベルの判定。
// 小中学生とボランティアのやり取りが対象のため、GEMINI_API_KEY が無い環境でも
// 監視が完全に止まらないよう、禁止語パターンによる簡易検知にフォールバックする。

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** リスクレベル(DBの alert_level と対応。低は記録のみでアラートは出さない) */
export type RiskLevel = "low" | "medium" | "high" | "urgent";

export type ModerationResult = {
  /** 不適切な兆候があるか(H-04) */
  flagged: boolean;
  /** 兆候ありのときのリスクレベル(H-05) */
  level: RiskLevel | null;
  /** 管理者へ提示する日本語の理由 */
  reason: string;
  /** 判定の出所。運用でAIが効いているかを確認できるようにする */
  source: "gemini" | "keyword";
};

export type ConversationTurn = {
  speaker: string;
  body: string;
};

const SYSTEM_INSTRUCTION = [
  "あなたは、小中学生と学習ボランティアのオンライン指導チャットを見守る安全管理AIです。",
  "直近の会話の流れをふまえ、最新の発言に子どもの安全上の懸念があるかを判定してください。",
  "",
  "【確認する観点】",
  "・個人の連絡先(電話番号、メール、SNSのID)の交換",
  "・アプリの外や対面で会おうとする誘い",
  "・金銭やプレゼントの要求・提供",
  "・性的な発言、身体や容姿への不適切な言及",
  "・侮辱、脅迫、いじめにあたる発言",
  "・自傷や他害をほのめかす発言",
  "",
  "【リスクレベルの目安】",
  "・urgent: 対面で会う約束、連絡先の交換、性的な接触の示唆、自傷他害の切迫。すぐに大人の介入が必要。",
  "・high: 侮辱・脅迫、金銭の要求、繰り返される不適切な発言。",
  "・medium: 不適切だが軽度、または判断に迷う境界的な発言。",
  "・low: 学習上の雑談の範囲だが一応記録しておきたい程度。",
  "",
  "学習内容に関する正常なやり取り(教科の質問、励まし、日程調整など)は flagged=false としてください。",
  "reason は管理者向けに、日本語で60文字以内の簡潔な説明にしてください。",
].join("\n");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    flagged: { type: "boolean" },
    level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    reason: { type: "string" },
  },
  required: ["flagged", "level", "reason"],
};

export function isModerationAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * H-03〜H-05: 最新メッセージを直近の会話とあわせて判定する。
 * AI が使えない・失敗した場合は禁止語パターンの結果を返す(無検知にはしない)。
 */
export async function analyzeMessage(
  body: string,
  context: ConversationTurn[] = [],
): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return analyzeByKeyword(body);

  const history = context
    .slice(-10)
    .map((t) => `${t.speaker}: ${t.body}`)
    .join("\n");
  const prompt = [
    "【直近の会話】",
    history || "(これが最初の発言です)",
    "",
    "【判定対象の最新の発言】",
    body,
  ].join("\n");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
        // 有害表現の検知自体が目的のため、入力を安全フィルタで遮断させない
        safetySettings: [
          "HARM_CATEGORY_HARASSMENT",
          "HARM_CATEGORY_HATE_SPEECH",
          "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "HARM_CATEGORY_DANGEROUS_CONTENT",
        ].map((category) => ({ category, threshold: "BLOCK_NONE" })),
      }),
    });
    if (!res.ok) {
      console.error("AI監視の解析失敗", res.status, res.statusText);
      return analyzeByKeyword(body);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("AI監視の解析失敗: 応答が空");
      return analyzeByKeyword(body);
    }

    const parsed = JSON.parse(text) as { flagged?: boolean; level?: string; reason?: string };
    const level = toRiskLevel(parsed.level);
    if (!parsed.flagged || !level) {
      return { flagged: false, level: null, reason: "問題なし", source: "gemini" };
    }
    return {
      flagged: true,
      level,
      reason: (parsed.reason ?? "").trim() || "不適切な兆候を検知しました",
      source: "gemini",
    };
  } catch (error) {
    console.error("AI監視の解析失敗", error instanceof Error ? error.message : error);
    return analyzeByKeyword(body);
  }
}

type KeywordRule = {
  level: RiskLevel;
  reason: string;
  pattern: RegExp;
};

// AI 未設定時の最低限の網。誤検知より見落としを避ける方針で緩めに設定する。
const KEYWORD_RULES: KeywordRule[] = [
  {
    level: "urgent",
    reason: "電話番号らしき文字列が含まれています",
    pattern: /0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/,
  },
  {
    level: "urgent",
    reason: "メールアドレスらしき文字列が含まれています",
    pattern: /[\w.+-]+@[\w-]+\.[\w.]+/,
  },
  {
    level: "urgent",
    reason: "SNSのIDや連絡先の交換が疑われます",
    pattern:
      /(ライン|LINE|ﾗｲﾝ|インスタ|instagram|discord|カカオ)\s*(の)?\s*(ID|id|アカウント|交換|教えて)/i,
  },
  {
    level: "urgent",
    reason: "アプリの外で会う誘いが疑われます",
    pattern: /(会おう|会いたい|会える|直接会|二人で会|待ち合わせ|迎えに行く|家に来|うちに来)/,
  },
  {
    level: "high",
    reason: "金銭やプレゼントのやり取りが疑われます",
    pattern: /(お金|現金|振込|振り込|課金|プレゼント|おごる|ギフトカード|paypay|PayPay)/,
  },
  {
    level: "high",
    reason: "侮辱・脅迫にあたる表現が含まれています",
    // 日本語には単語境界が無いため、無関係な語に含まれる形(「ばかり」「バカンス」
    // 「アホウドリ」など)は後続の文字で除外する。
    pattern:
      /(死ね|殺す|消えろ|ばか(?![りらげし])|バカ(?![ンﾝ])|馬鹿|アホ(?![ウｳ])|きもい|キモい|うざい|ブス|デブ)/,
  },
  {
    level: "urgent",
    reason: "自傷・他害をほのめかす表現が含まれています",
    pattern: /(死にたい|自殺|リストカット|消えたい)/,
  },
  {
    level: "medium",
    reason: "秘密の共有を求める表現が含まれています",
    pattern: /(秘密にして|内緒|誰にも言わないで|先生には言わ)/,
  },
  {
    level: "medium",
    reason: "容姿や身体への言及が含まれています",
    pattern: /(かわいいね|可愛いね|写真送って|自撮り|体型|裸)/,
  },
];

const LEVEL_ORDER: RiskLevel[] = ["low", "medium", "high", "urgent"];

/** AI 未設定・失敗時のフォールバック判定 */
export function analyzeByKeyword(body: string): ModerationResult {
  const hits = KEYWORD_RULES.filter((rule) => rule.pattern.test(body));
  if (hits.length === 0) {
    return { flagged: false, level: null, reason: "問題なし", source: "keyword" };
  }

  // 最も重いレベルを採用し、理由はまとめて提示する
  const level = hits.reduce<RiskLevel>(
    (max, hit) => (LEVEL_ORDER.indexOf(hit.level) > LEVEL_ORDER.indexOf(max) ? hit.level : max),
    "low",
  );
  return {
    flagged: true,
    level,
    reason: hits.map((h) => h.reason).join(" / "),
    source: "keyword",
  };
}

function toRiskLevel(value: string | undefined): RiskLevel | null {
  return LEVEL_ORDER.includes(value as RiskLevel) ? (value as RiskLevel) : null;
}
