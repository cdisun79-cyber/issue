import { requireUser, unauthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendToMe } from "@/lib/kakao";

// 서버에서 메시지를 조립한다 (클라이언트가 보낸 문구를 그대로 신뢰하지 않음)
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const b = await req.json();
  const { pressName, title, summary, imageUrl, staffId, articleText } = b as {
    pressName?: string;
    title?: string;
    summary?: string;
    imageUrl?: string;
    staffId?: string;
    articleText?: string;
  };
  if (!title || !summary || !staffId) {
    return Response.json({ error: "제목, 요약, 담당자는 필수입니다." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: staff } = await sb.from("staff").select("*").eq("id", staffId).single();
  if (!staff) return Response.json({ error: "담당자를 찾을 수 없습니다." }, { status: 404 });

  const headline = pressName ? `(${pressName}) ${title}` : title;
  const message = `*${staff.dept_name}(${staff.name}${staff.rank})전달하겠습니다.`;

  try {
    await sendToMe(user.id, {
      headline,
      description: `${summary}\n${message}`,
      imageUrl,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  await sb.from("send_log").insert({
    user_id: user.id,
    image_url: imageUrl,
    press_name: pressName,
    article_title: title,
    article_text: articleText,
    summary,
    staff_id: staffId,
    message,
  });
  return Response.json({ ok: true, headline, message });
}
