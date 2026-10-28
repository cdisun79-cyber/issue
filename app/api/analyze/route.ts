import { randomUUID } from "crypto";
import { requireUser, unauthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { analyzeArticle } from "@/lib/claude";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

// 이미지 업로드 → Storage 저장 → Claude 분석
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

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
  const ext = mediaType.split("/")[1];
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const sb = supabaseAdmin();
  const up = await sb.storage.from("articles").upload(path, buf, { contentType: mediaType });
  if (up.error) return Response.json({ error: up.error.message }, { status: 500 });
  const imageUrl = sb.storage.from("articles").getPublicUrl(path).data.publicUrl;

  try {
    const analysis = await analyzeArticle(buf.toString("base64"), mediaType);
    return Response.json({ imageUrl, ...analysis });
  } catch (e) {
    return Response.json(
      { error: `분석 실패: ${(e as Error).message}`, imageUrl },
      { status: 500 }
    );
  }
}
