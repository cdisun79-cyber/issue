"use client";
import { useEffect, useState } from "react";

type Staff = { id: string; dept_name: string; name: string; rank: string; duties: string | null };

function Compose() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [done, setDone] = useState(false);
  const [press, setPress] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [cands, setCands] = useState<Staff[]>([]);
  const [picked, setPicked] = useState<Staff | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

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
    setDone(false); setPress(""); setTitle(""); setSummary("");
    setText(""); setKeywords([]); setSaved(false);
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
    setPress(j.press_name ?? ""); setTitle(j.title ?? "");
    setSummary(j.summary);
    setText(j.text); setKeywords(j.keywords); setSaved(false);
    setDone(true);
    await searchStaff(`keywords=${encodeURIComponent(j.keywords.join(","))}`);
  };

  const headline = press ? `(${press}) ${title}` : title;
  const message = picked ? `*${picked.dept_name}(${picked.name}${picked.rank})전달하겠습니다.` : "";
  const result = [headline, summary, message].filter(Boolean).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setMsg({ ok: true, t: "복사했습니다." });
    } catch {
      setMsg({ ok: false, t: "복사에 실패했습니다. 직접 선택해서 복사하세요." });
    }
  };

  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pressName: press, title, summary, keywords, articleText: text,
        staffId: picked?.id ?? null, message,
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) setSaved(true);
    setMsg(r.ok ? { ok: true, t: "저장했습니다. (이력 메뉴에서 확인)" } : { ok: false, t: j.error });
  };

  return (
    <>
      <div className="card">
        <h2>1. 기사 이미지</h2>
        <div className="drop">
          {preview ? <img src={preview} alt="기사" /> : "여기에 Ctrl+V 로 붙여넣거나 파일을 선택하세요"}
        </div>
        <div className="row">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <button disabled={!file || busy} onClick={analyze}>{busy ? "분석 중…" : "분석하기"}</button>
        </div>
      </div>

      {done && (
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
            <h2>4. 결과</h2>
            <div className="preview">
              <img src={preview} alt="" />
              <b>{headline}</b>{"\n"}{summary}{"\n"}{message}
            </div>
            <div className="row">
              <button disabled={!result} onClick={copy}>텍스트 복사</button>
              <button className="sub" disabled={busy || saved || !summary.trim()} onClick={save}>
                {saved ? "저장됨" : "결과 저장"}
              </button>
            </div>
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
