import { supabaseAdmin } from "@/lib/supabase";

// POST: 결과 저장
export async function POST(req: Request) {
  const { pressName, title, staffId, message } = (await req.json()) as {
    pressName?: string;
    title?: string;
    staffId?: string | null;
    message?: string;
  };
  if (!title?.trim()) {
    return Response.json({ error: "기사제목이 비어 있습니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("analysis_log")
    .insert({
      press_name: pressName || null,
      article_title: title,
      staff_id: staffId || null,
      message: message || null,
    })
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

// GET: 최근 이력
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("analysis_log")
    .select("id, press_name, article_title, message, created_at, staff(dept_name, name, rank)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ logs: data });
}
