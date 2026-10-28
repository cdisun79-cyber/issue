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
  "summary": 핵심을 담은 한국어 한 줄 요약 (60자 이내, 존댓말 아님, 마침표로 끝),
  "keywords": 담당 부서 매칭에 쓸 핵심 주제어 3~6개 (정책·사업·분야 중심 명사)
}`;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// Google Gemini (무료 티어). 모델명은 GEMINI_MODEL로 바꿀 수 있다.
export async function analyzeArticle(
  base64: string,
  mediaType: MediaType
): Promise<Analysis> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType, data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const res = await r.json();
  if (!r.ok) throw new Error(res.error?.message || `Gemini 오류 ${r.status}`);

  const raw = (res.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
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
