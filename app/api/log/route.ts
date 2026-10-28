import { supabaseAdmin } from "@/lib/supabase";

// POST: 분석 결과 저장
export async function POST(req: Request) {
  const b = await req.json();
  const { pressName, title, summary, keywords, articleText, staffId, message } = b as {
    pressName?: string;
    title?: string;
    summary?: string;
    keywords?: string[];
    articleText?: string;
    staffId?: string | null;
    message?: string;
  };
  if (!summary?.trim()) {
    return Response.json({ error: "요약이 비어 있습니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("analysis_log")
    .insert({
      press_name: pressName || null,
      article_title: title || null,
      summary,
      keywords: Array.isArray(keywords) ? keywords : null,
      article_text: articleText || null,
      staff_id: staffId || null,
      message: message || null,
    })
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

// GET: 최근 이력 (본문은 목록에서 제외)
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("analysis_log")
    .select("id, press_name, article_title, summary, message, created_at, staff(dept_name, name, rank)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ logs: data });
}
