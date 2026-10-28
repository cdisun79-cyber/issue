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

-- 발송 이력
create table if not exists send_log (
  id            uuid primary key default gen_random_uuid(),
  image_url     text,
  press_name    text,
  article_title text,
  article_text  text,
  summary       text not null,
  staff_id      uuid references staff(id),
  message       text not null,
  sent_at       timestamptz default now()
);

-- 카카오 토큰 (서버 전용, 1인용이라 한 행 'me'만 사용)
create table if not exists kakao_tokens (
  id                 text primary key default 'me',
  access_token       text not null,
  refresh_token      text not null,
  refresh_expires_at timestamptz not null
);

-- RLS: 정책이 없으면 클라이언트(anon/authenticated) 접근 차단.
-- 모든 접근은 서버(API Route)의 service role로만 수행한다.
alter table staff        enable row level security;
alter table send_log     enable row level security;
alter table kakao_tokens enable row level security;

-- 기사 이미지 버킷 (카카오가 이미지 URL을 읽어야 하므로 public)
insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do nothing;
