import { analyzeArticle } from "@/lib/gemini";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

// 이미지 → Gemini 분석 (이미지는 저장하지 않는다)
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return Response.json({ error: "이미지가 없습니다." }, { status: 400 });
  }
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) {
    return Response.json({ error: "jpg/png/gif/webp만 가능합니다." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    return Response.json(await analyzeArticle(buf.toString("base64"), mediaType));
  } catch (e) {
    return Response.json({ error: `분석 실패: ${(e as Error).message}` }, { status: 500 });
  }
}
