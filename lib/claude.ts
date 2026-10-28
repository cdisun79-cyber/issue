import Anthropic from "@anthropic-ai/sdk";

export type Analysis = {
  press_name: string | null;
  title: string | null;
  text: string;
  summary: string;
  keywords: string[];
};

const PROMPT = `이미지는 언론 기사 캡처입니다. 아래 JSON만 출력하세요(설명·코드블록 금지).
{
  "press_name": 언론사명. 이미지에 보이지 않으면 null (추측 금지),
  "title": 기사 제목. 보이지 않으면 null,
  "text": 기사 본문 전체 텍스트,
  "summary": 핵심을 담은 한국어 한 줄 요약 (60자 이내, 존댓말 아님, 마침표로 끝)",
  "keywords": 담당 부서 매칭에 쓸 핵심 주제어 3~6개 (정책·사업·분야 중심 명사)
}`;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function analyzeArticle(
  base64: string,
  mediaType: MediaType
): Promise<Analysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const raw = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/^```(?:json)?\s*|\s*```$/g, "")
    .trim();
  const j = JSON.parse(raw);
  return {
    press_name: j.press_name ?? null,
    title: j.title ?? null,
    text: j.text ?? "",
    summary: j.summary ?? "",
    keywords: Array.isArray(j.keywords) ? j.keywords.map(String) : [],
  };
}
