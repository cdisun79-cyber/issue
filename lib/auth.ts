import { supabaseAdmin } from "./supabase";

// Authorization: Bearer <supabase access token> 검증 + 허용 이메일 확인
export async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  const allowed = process.env.ALLOWED_EMAIL;
  if (allowed && data.user.email !== allowed) return null;
  return data.user;
}

export const unauthorized = () =>
  Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
