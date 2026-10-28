"use client";
import { useEffect, useRef, useState } from "react";

type Staff = { id: string; dept_name: string; name: string; rank: string; duties: string | null };

function Compose() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [press, setPress] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [text, setText] = useState("");
  const [cands, setCands] = useState<Staff[]>([]);
  const [picked, setPicked] = useState<Staff | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [kakao, setKakao] = useState<{ connected: boolean; url: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/kakao/login").then((r) => r.json()).then(setKakao);
    const k = new URLSearchParams(location.search).get("kakao");
    if (k) setMsg({ ok: k === "ok", t: k === "ok" ? "카카오 연결 완료" : "카카오 연결 실패" });
  }, []);

  // Ctrl+V 이미지 붙여넣기
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) pick(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const pick = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setImageUrl(""); setPress(""); setTitle(""); setSummary(""); setText("");
    setCands([]); setPicked(null); setMsg(null);
  };

  const searchStaff = async (params: string) => {
    const r = await fetch(`/api/staff/search?${params}`);
    const j = await r.json();
    setCands(j.staff ?? []);
    setPicked(j.staff?.[0] ?? null);
  };

  const analyze = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append("image", file);
    const r = await fetch("/api/analyze", { method: "POST", body: fd });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error });
    setImageUrl(j.imageUrl);
    setPress(j.press_name ?? ""); setTitle(j.title ?? "");
    setSummary(j.summary); setText(j.text);
    await searchStaff(`keywords=${encodeURIComponent(j.keywords.join(","))}`);
  };

  const headline = press ? `(${press}) ${title}` : title;
  const message = picked ? `*${picked.dept_name}(${picked.name}${picked.rank})전달하겠습니다.` : "";

  const send = async () => {
    if (!picked) return;
    setBusy(true);
    const r = await fetch("/api/kakao/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pressName: press, title, summary, imageUrl, staffId: picked.id, articleText: text,
      }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, t: "카톡으로 보냈습니다." } : { ok: false, t: j.error });
  };

  return (
    <>
      {kakao && !kakao.connected && (
        <div className="card">
          <p className="err">카카오가 연결되지 않았습니다.</p>
          <button onClick={() => (location.href = kakao.url)}>카카오 연결</button>
        </div>
      )}

      <div className="card" ref={boxRef}>
        <h2>1. 기사 이미지</h2>
        <div className="drop">
          {preview ? <img src={preview} alt="기사" /> : "여기에 Ctrl+V 로 붙여넣거나 파일을 선택하세요"}
        </div>
        <div className="row">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <button disabled={!file || busy} onClick={analyze}>{busy ? "분석 중…" : "분석하기"}</button>
        </div>
      </div>

      {imageUrl && (
        <>
          <div className="card">
            <h2>2. 기사 정보 (수정 가능)</h2>
            <input placeholder="언론사명" value={press} onChange={(e) => setPress(e.target.value)} />
            <input placeholder="기사제목" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea placeholder="한 줄 요약" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div className="card">
            <h2>3. 담당자 선택</h2>
            <div className="row">
              <input placeholder="직접 검색 (부서/이름/업무)" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStaff(`q=${encodeURIComponent(q)}`)} />
              <button className="sub" onClick={() => searchStaff(`q=${encodeURIComponent(q)}`)}>검색</button>
            </div>
            {cands.length === 0 && <p>일치하는 담당자가 없습니다. 직접 검색해 보세요.</p>}
            {cands.map((s) => (
              <button key={s.id} className={`cand ${picked?.id === s.id ? "on" : ""}`} onClick={() => setPicked(s)}>
                <b>{s.dept_name}</b> · {s.name} {s.rank}
                {s.duties && <div style={{ fontSize: ".85rem", color: "#666" }}>{s.duties}</div>}
              </button>
            ))}
          </div>

          <div className="card">
            <h2>4. 카톡 미리보기</h2>
            <div className="preview">
              <img src={imageUrl} alt="" />
              <b>{headline}</b>{"\n"}{summary}{"\n"}{message}
            </div>
            <button disabled={busy || !picked || !title || !summary || !kakao?.connected} onClick={send}>
              {busy ? "전송 중…" : "카톡으로 보내기"}
            </button>
          </div>
        </>
      )}
      {msg && <p className={msg.ok ? "ok" : "err"}>{msg.t}</p>}
    </>
  );
}

export default function Page() {
  return <Compose />;
}
