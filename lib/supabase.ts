import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 브라우저용 (로그인/세션만 사용). 빌드 시 환경변수 없이도 import 되도록 처음 쓸 때 생성.
let browser: SupabaseClient | null = null;
export function supabaseBrowser() {
  return (browser ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
}

// 서버 전용 (service role). 클라이언트 코드에서 import 금지.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
