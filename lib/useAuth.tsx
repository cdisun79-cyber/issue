"use client";
import { useEffect, useState, type ReactNode } from "react";
import { supabaseBrowser } from "./supabase";

// NEXT_PUBLIC_ 값은 빌드 시 코드에 포함된다. 비어 있으면 Vercel 환경변수 등록 후 재배포 필요.
const envMissing =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useSession() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (envMissing) {
      setReady(true);
      return;
    }
    supabaseBrowser().auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setReady(true);
    });
    const { data } = supabaseBrowser().auth.onAuthStateChange((_e, s) =>
      setToken(s?.access_token ?? null)
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return { token, ready };
}

export const authFetch = (token: string, input: string, init: RequestInit = {}) =>
  fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });

export function LoginGate({ children }: { children: (token: string) => ReactNode }) {
  const { token, ready } = useSession();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  if (envMissing) {
    return (
      <div className="card">
        <h2>환경변수가 설정되지 않았습니다</h2>
        <p className="err">
          NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 값이 없습니다.
          Vercel → Settings → Environment Variables에 등록한 뒤 Redeploy 하세요.
        </p>
      </div>
    );
  }
  if (!ready) return <p>불러오는 중…</p>;
  if (token) return <>{children(token)}</>;

  const login = async () => {
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: pw });
    setErr(error ? error.message : "");
  };
  return (
    <div className="card" style={{ maxWidth: 360 }}>
      <h2>로그인</h2>
      <input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="비밀번호" value={pw}
        onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
      <button onClick={login}>로그인</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
