"use client";
import { useEffect, useState } from "react";

type Staff = { id: string; dept_name: string; name: string; rank: string; duties: string | null };

function Compose() {
  const [preview, setPreview] = useState("");
  const [press, setPress] = useState("");
  const [title, setTitle] = useState("");
  const [cands, setCands] = useState<Staff[]>([]);
  const [picked, setPicked] = useState<Staff | null>(null);
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const searchStaff = async (query: string) => {
    const r = await fetch(`/api/staff/search?q=${encodeURIComponent(query)}`);
    const j = await r.json();
    setCands(j.staff ?? []);
  };

  useEffect(() => { searchStaff(""); }, []);

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
    setPreview(URL.createObjectURL(f)); // 이미지는 서버로 보내지 않고 화면에만 표시
    setSaved(false); setMsg(null);
  };

  const headline = press ? `(${press}) ${title}` : title;
  const message = picked ? `*${picked.dept_name}(${picked.name}${picked.rank})전달하겠습니다.` : "";
  const result = [headline, message].filter(Boolean).join("\n");

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
      body: JSON.stringify({ pressName: press, title, staffId: picked?.id, message }),
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
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      </div>

      <div className="card">
        <h2>2. 기사 정보</h2>
        <input placeholder="언론사명" value={press} onChange={(e) => { setPress(e.target.value); setSaved(false); }} />
        <input placeholder="기사제목" value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} />
      </div>

      <div className="card">
        <h2>3. 담당자 선택</h2>
        <div className="row">
          <input placeholder="검색 (부서/이름/업무)" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchStaff(q)} />
          <button className="sub" onClick={() => searchStaff(q)}>검색</button>
        </div>
        {cands.length === 0 && <p>일치하는 담당자가 없습니다. 담당현황 메뉴에서 CSV를 업로드했는지 확인하세요.</p>}
        {cands.map((s) => (
          <button key={s.id} className={`cand ${picked?.id === s.id ? "on" : ""}`}
            onClick={() => { setPicked(s); setSaved(false); }}>
            <b>{s.dept_name}</b> · {s.name} {s.rank}
            {s.duties && <div style={{ fontSize: ".85rem", color: "#666" }}>{s.duties}</div>}
          </button>
        ))}
      </div>

      <div className="card">
        <h2>4. 결과</h2>
        <div className="preview">
          {preview && <img src={preview} alt="" />}
          <b>{headline}</b>{"\n"}{message}
        </div>
        <div className="row">
          <button disabled={!result} onClick={copy}>텍스트 복사</button>
          <button className="sub" disabled={busy || saved || !title.trim() || !picked} onClick={save}>
            {saved ? "저장됨" : "결과 저장"}
          </button>
        </div>
      </div>
      {msg && <p className={msg.ok ? "ok" : "err"}>{msg.t}</p>}
    </>
  );
}

export default function Page() {
  return <Compose />;
}
