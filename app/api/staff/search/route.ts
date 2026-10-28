import { requireUser, unauthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// PostgREST or() 필터를 깨뜨리는 문자 제거
const clean = (s: string) => s.replace(/[,()%*\\]/g, " ").trim();

// GET /api/staff/search?q=홍길동        (직접 검색)
// GET /api/staff/search?keywords=예산,복지 (기사 키워드 기반 후보 추천)
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const terms = [
    ...(url.searchParams.get("q") ?? "").split(/\s+/),
    ...(url.searchParams.get("keywords") ?? "").split(","),
  ]
    .map(clean)
    .filter(Boolean);

  const sb = supabaseAdmin();
  let q = sb.from("staff").select("*").eq("is_active", true).limit(200);

  if (terms.length) {
    q = q.or(
      terms
        .flatMap((t) => [`dept_name.ilike.%${t}%`, `name.ilike.%${t}%`, `duties.ilike.%${t}%`])
        .join(",")
    );
  } else {
    q = q.order("dept_name");
  }

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 일치한 검색어 개수로 정렬
  const score = (s: { dept_name: string; name: string; duties: string | null }) => {
    const hay = `${s.dept_name} ${s.name} ${s.duties ?? ""}`;
    return terms.filter((t) => hay.includes(t)).length;
  };
  const rows = (data ?? []).sort((a, b) => score(b) - score(a)).slice(0, terms.length ? 10 : 200);
  return Response.json({ staff: rows });
}
