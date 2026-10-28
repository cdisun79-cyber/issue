create extension if not exists pg_trgm;

-- 담당현황
create table if not exists staff (
  id         uuid primary key default gen_random_uuid(),
  dept_name  text not null,          -- 부서명
  name       text not null,          -- 이름
  rank       text not null,          -- 직급
  duties     text,                   -- 담당업무/키워드 (자동 매칭용, 선택)
  is_active  boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (dept_name, name)
);
create index if not exists staff_dept_trgm on staff using gin (dept_name gin_trgm_ops);
create index if not exists staff_duties_trgm on staff using gin (duties gin_trgm_ops);

-- RLS: 정책이 없으면 클라이언트(anon/authenticated) 접근 차단.
-- 모든 접근은 서버(API Route)의 service role로만 수행한다.
alter table staff enable row level security;

-- 이력 (사용자가 [결과 저장]을 누를 때 기록)
create table if not exists analysis_log (
  id            uuid primary key default gen_random_uuid(),
  press_name    text,
  article_title text not null,
  staff_id      uuid references staff(id) on delete set null,
  message       text,                -- 화면에 표시한 "*부서(이름직급)전달하겠습니다." 문구 스냅샷
  created_at    timestamptz default now()
);
create index if not exists analysis_log_created_idx on analysis_log (created_at desc);
alter table analysis_log enable row level security;

-- 이전 버전 테이블이 이미 있는 경우의 마이그레이션 (처음 만드는 경우 불필요)
-- alter table analysis_log drop column if exists summary, drop column if exists keywords, drop column if exists article_text;
-- alter table analysis_log alter column article_title set not null;  -- 기존 null 행이 있으면 먼저 정리
