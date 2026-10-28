import { requireUser, unauthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// 간단한 CSV 파서 (따옴표/쉼표 지원)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

// POST { csv: "부서명,이름,직급,업무\n..." }  → (부서명,이름) 기준 upsert
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const { csv } = await req.json();
  const rows = parseCsv(String(csv ?? "").replace(/^﻿/, ""));
  const [header, ...body] = rows;
  if (!header) return Response.json({ error: "빈 파일입니다." }, { status: 400 });

  const idx = (names: string[]) => header.findIndex((h) => names.includes(h.trim()));
  const iDept = idx(["부서명", "부서"]);
  const iName = idx(["이름", "성명"]);
  const iRank = idx(["직급"]);
  const iDuty = idx(["업무", "담당업무"]);
  if (iDept < 0 || iName < 0 || iRank < 0) {
    return Response.json(
      { error: "첫 줄에 '부서명, 이름, 직급' 컬럼이 필요합니다. (업무는 선택)" },
      { status: 400 }
    );
  }

  const staff = body
    .map((r) => ({
      dept_name: r[iDept]?.trim(),
      name: r[iName]?.trim(),
      rank: r[iRank]?.trim(),
      duties: iDuty >= 0 ? r[iDuty]?.trim() || null : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }))
    .filter((s) => s.dept_name && s.name && s.rank);

  const { error } = await supabaseAdmin()
    .from("staff")
    .upsert(staff, { onConflict: "dept_name,name" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ imported: staff.length });
}
