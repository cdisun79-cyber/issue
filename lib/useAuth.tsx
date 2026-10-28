"use client";
import { useEffect, useState, type ReactNode } from "react";
import { supabaseBrowser } from "./supabase";

export function useSession() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setReady(true);
    });
    const { data } = supabaseBrowser.auth.onAuthStateChange((_e, s) =>
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

  if (!ready) return <p>불러오는 중…</p>;
  if (token) return <>{children(token)}</>;

  const login = async () => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password: pw });
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
