"use client";
import { useEffect, useState } from "react";

type Log = {
  id: string;
  press_name: string | null;
  article_title: string | null;
  message: string | null;
  created_at: string;
};

export default function Page() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/log")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setLogs(j.logs);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const shown = (logs ?? []).filter((l) =>
    `${l.press_name ?? ""} ${l.article_title ?? ""} ${l.message ?? ""}`.includes(q)
  );

  return (
    <div className="card">
      <h2>분석 이력 {logs && `(${shown.length})`}</h2>
      <input placeholder="검색 (언론사/제목/담당)" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="err">{err}</p>}
      {!logs && !err && <p>불러오는 중…</p>}
      {logs && shown.length === 0 && <p>기록이 없습니다.</p>}
      {shown.map((l) => (
        <div key={l.id} className="preview">
          <b>{l.press_name ? `(${l.press_name}) ` : ""}{l.article_title}</b>{"\n"}
          {l.message}{"\n"}
          <span style={{ color: "#666", fontSize: ".85rem" }}>
            {new Date(l.created_at).toLocaleString("ko-KR")}
          </span>
        </div>
      ))}
    </div>
  );
}
