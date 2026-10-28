import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "./supabase";

const REST_KEY = () => process.env.KAKAO_REST_API_KEY!;
const REDIRECT = () => process.env.KAKAO_REDIRECT_URI!;

// 로그인이 없는 1인용 앱이므로 카카오 토큰은 한 행('me')만 저장한다.
const OWNER = "me";

// ---- OAuth state (위조 방지용 서명) ----
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sign = () => createHmac("sha256", secret()).update(OWNER).digest("hex");
export const makeState = () => `${OWNER}.${sign()}`;
export function verifyState(state: string | null): boolean {
  const sig = state?.split(".")[1];
  if (!sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeUrl() {
  const p = new URLSearchParams({
    client_id: REST_KEY(),
    redirect_uri: REDIRECT(),
    response_type: "code",
    scope: "talk_message",
    state: makeState(),
  });
  return `https://kauth.kakao.com/oauth/authorize?${p}`;
}

async function tokenRequest(params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: REST_KEY(),
    client_secret: process.env.KAKAO_CLIENT_SECRET || "",
    ...params,
  });
  const r = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`카카오 토큰 오류: ${j.error_description || j.error}`);
  return j as {
    access_token: string;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };
}

export async function exchangeCode(code: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    redirect_uri: REDIRECT(),
    code,
  });
  await supabaseAdmin().from("kakao_tokens").upsert({
    id: OWNER,
    access_token: t.access_token,
    refresh_token: t.refresh_token!,
    refresh_expires_at: new Date(
      Date.now() + (t.refresh_token_expires_in ?? 5184000) * 1000
    ).toISOString(),
  });
}

async function refresh(refreshToken: string) {
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  const patch: Record<string, string> = { access_token: t.access_token };
  if (t.refresh_token) {
    patch.refresh_token = t.refresh_token;
    patch.refresh_expires_at = new Date(
      Date.now() + (t.refresh_token_expires_in ?? 5184000) * 1000
    ).toISOString();
  }
  await supabaseAdmin().from("kakao_tokens").update(patch).eq("id", OWNER);
  return t.access_token;
}

export async function isKakaoConnected() {
  const { data } = await supabaseAdmin()
    .from("kakao_tokens")
    .select("refresh_expires_at")
    .eq("id", OWNER)
    .maybeSingle();
  return !!data && new Date(data.refresh_expires_at) > new Date();
}

export type FeedInput = {
  headline: string; // (언론사명) 기사제목
  description: string; // 요약 + 전달 문구
  imageUrl?: string | null;
};

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function memoSend(accessToken: string, f: FeedInput) {
  const link = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
  const template = {
    object_type: "feed",
    content: {
      title: cut(f.headline, 50),
      description: f.description,
      image_url: f.imageUrl || undefined,
      link: { web_url: link, mobile_web_url: link },
    },
  };
  return fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }),
  });
}

// "나에게 보내기". access token 만료(401) 시 refresh 후 1회 재시도.
export async function sendToMe(f: FeedInput) {
  const { data } = await supabaseAdmin()
    .from("kakao_tokens")
    .select("*")
    .eq("id", OWNER)
    .maybeSingle();
  if (!data) throw new Error("카카오 연결이 필요합니다.");

  let r = await memoSend(data.access_token, f);
  if (r.status === 401) {
    const fresh = await refresh(data.refresh_token);
    r = await memoSend(fresh, f);
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`카톡 전송 실패: ${j.msg || r.status}`);
  }
}
