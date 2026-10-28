"use client";
import { useCallback, useEffect, useState } from "react";

type Staff = { id: string; dept_name: string; name: string; rank: string; duties: string | null };

function StaffAdmin() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/staff/search?q=${encodeURIComponent(q)}`);
    setRows((await r.json()).staff ?? []);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const upload = async (f: File) => {
    const csv = await f.text();
    const r = await fetch("/api/staff/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const j = await r.json();
    setMsg(r.ok ? `${j.imported}건 반영했습니다.` : j.error);
    if (r.ok) load();
  };

  return (
    <>
      <div className="card">
        <h2>담당현황 업로드 (CSV)</h2>
        <p style={{ margin: 0, fontSize: ".9rem" }}>
          첫 줄: <code>부서명,이름,직급,업무</code> (업무는 선택, 엑셀은 "CSV UTF-8"로 저장)
        </p>
        <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {msg && <p className="ok">{msg}</p>}
      </div>
      <div className="card">
        <h2>담당현황 ({rows.length})</h2>
        <input placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <table>
          <thead><tr><th>부서명</th><th>이름</th><th>직급</th><th>업무</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}><td>{s.dept_name}</td><td>{s.name}</td><td>{s.rank}</td><td>{s.duties}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Page() {
  return <StaffAdmin />;
}
