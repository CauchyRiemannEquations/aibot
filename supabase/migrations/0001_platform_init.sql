-- =============================================================================
-- SOCRA 플랫폼 초기 스키마
-- 다중 교사 공유 플랫폼: 프로필, 제공업체 자격증명, 반, 익명 학생 세션, 사용량 집계
-- Row Level Security 및 원자적 사용량 한도 함수 포함
-- =============================================================================

create extension if not exists pgcrypto;

-- ── 공통: updated_at 자동 갱신 트리거 함수 ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 신규 auth 사용자 → 프로필 자동 생성 (관리자 여부는 앱에서 env로 판단)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'teacher')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── provider_credentials ─────────────────────────────────────────────────────
-- API 키 원문은 저장하지 않는다. AES-256-GCM 암호문/IV/authTag만 저장.
create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('google', 'openai', 'anthropic', 'openrouter')),
  encrypted_api_key text not null,
  encryption_iv text not null,
  encryption_auth_tag text not null,
  encryption_key_version integer not null default 1,
  api_key_last4 text not null,
  status text not null default 'unchecked' check (status in ('active', 'invalid', 'unchecked')),
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, provider)
);

create index if not exists provider_credentials_teacher_idx
  on public.provider_credentials (teacher_id);

create trigger provider_credentials_set_updated_at
  before update on public.provider_credentials
  for each row execute function public.set_updated_at();

-- ── classrooms ───────────────────────────────────────────────────────────────
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  public_slug text not null unique,
  provider_credential_id uuid references public.provider_credentials (id) on delete set null,
  subject_id text not null default 'calculus-1',
  vision_model text,
  tutor_model text,
  solver_model text,
  guidance_note text,
  is_active boolean not null default true,
  optional_access_code_hash text,
  daily_limit_per_session integer not null default 30,
  daily_limit_total integer not null default 500,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classrooms_teacher_idx on public.classrooms (teacher_id);
create index if not exists classrooms_slug_idx on public.classrooms (public_slug);

create trigger classrooms_set_updated_at
  before update on public.classrooms
  for each row execute function public.set_updated_at();

-- ── student_sessions (익명) ──────────────────────────────────────────────────
-- 학생 개인정보를 저장하지 않는다. 쿠키의 랜덤 토큰을 해시로만 보관.
create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  anonymous_session_hash text not null,
  access_verified boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (classroom_id, anonymous_session_hash)
);

create index if not exists student_sessions_classroom_idx
  on public.student_sessions (classroom_id);

-- ── 사용량 집계 ───────────────────────────────────────────────────────────────
-- 반별·날짜별 집계 (Asia/Seoul 기준 날짜는 앱에서 계산해 전달)
create table if not exists public.usage_daily (
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  usage_date date not null,
  provider text,
  total_requests integer not null default 0,
  ocr_requests integer not null default 0,
  tutor_requests integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (classroom_id, usage_date)
);

-- 익명 세션별·날짜별 집계 (세션 한도 강제용)
create table if not exists public.session_usage_daily (
  student_session_id uuid not null references public.student_sessions (id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (student_session_id, usage_date)
);

-- ── 원자적 사용량 소비 함수 ───────────────────────────────────────────────────
-- 반 전체 한도와 세션 한도를 행 잠금으로 원자적으로 확인·증가한다.
-- 동시 요청이 들어와도 한도가 우회되지 않는다.
create or replace function public.consume_quota(
  p_classroom_id uuid,
  p_session_id uuid,
  p_kind text,
  p_session_limit integer,
  p_total_limit integer,
  p_provider text,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_count integer;
  v_session_count integer;
begin
  -- 반 전체 카운트 행을 upsert + 잠금
  insert into usage_daily (classroom_id, usage_date, provider)
    values (p_classroom_id, p_date, p_provider)
    on conflict (classroom_id, usage_date)
      do update set provider = coalesce(excluded.provider, usage_daily.provider)
    returning total_requests into v_total_count;

  if p_total_limit is not null and p_total_limit > 0 and v_total_count >= p_total_limit then
    return jsonb_build_object('allowed', false, 'reason', 'total_limit');
  end if;

  -- 세션 카운트 행을 upsert + 잠금
  insert into session_usage_daily (student_session_id, usage_date)
    values (p_session_id, p_date)
    on conflict (student_session_id, usage_date)
      do update set last_seen_at = now()
    returning request_count into v_session_count;

  if p_session_limit is not null and p_session_limit > 0 and v_session_count >= p_session_limit then
    return jsonb_build_object('allowed', false, 'reason', 'session_limit');
  end if;

  update usage_daily set
    total_requests = total_requests + 1,
    ocr_requests = ocr_requests + case when p_kind = 'ocr' then 1 else 0 end,
    tutor_requests = tutor_requests + case when p_kind = 'tutor' then 1 else 0 end,
    provider = p_provider,
    updated_at = now()
  where classroom_id = p_classroom_id and usage_date = p_date;

  update session_usage_daily set
    request_count = request_count + 1,
    last_seen_at = now()
  where student_session_id = p_session_id and usage_date = p_date;

  return jsonb_build_object(
    'allowed', true,
    'session_count', v_session_count + 1,
    'total_count', v_total_count + 1
  );
end;
$$;

-- 요청 성공/실패 결과 기록 (한도와 무관, 리포트용)
create or replace function public.record_usage_result(
  p_classroom_id uuid,
  p_date date,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update usage_daily set
    success_count = success_count + case when p_success then 1 else 0 end,
    failure_count = failure_count + case when p_success then 0 else 1 end,
    updated_at = now()
  where classroom_id = p_classroom_id and usage_date = p_date;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.classrooms enable row level security;
alter table public.student_sessions enable row level security;
alter table public.usage_daily enable row level security;
alter table public.session_usage_daily enable row level security;

-- profiles: 본인만 조회·수정
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- provider_credentials: 교사 본인 소유만
create policy credentials_select_own on public.provider_credentials
  for select using (auth.uid() = teacher_id);
create policy credentials_insert_own on public.provider_credentials
  for insert with check (auth.uid() = teacher_id);
create policy credentials_update_own on public.provider_credentials
  for update using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy credentials_delete_own on public.provider_credentials
  for delete using (auth.uid() = teacher_id);

-- classrooms: 교사 본인 소유만 (학생 공개 조회 정책 없음 → anon 직접 조회 불가)
create policy classrooms_select_own on public.classrooms
  for select using (auth.uid() = teacher_id);
create policy classrooms_insert_own on public.classrooms
  for insert with check (auth.uid() = teacher_id);
create policy classrooms_update_own on public.classrooms
  for update using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy classrooms_delete_own on public.classrooms
  for delete using (auth.uid() = teacher_id);

-- usage_daily: 교사는 자신의 반 사용량만 조회
create policy usage_daily_select_own on public.usage_daily
  for select using (
    exists (
      select 1 from public.classrooms c
      where c.id = usage_daily.classroom_id and c.teacher_id = auth.uid()
    )
  );

-- student_sessions, session_usage_daily: anon/authenticated 직접 접근 정책 없음
-- → 서비스 역할(서버)만 접근. 학생 브라우저는 DB를 직접 읽지 못한다.

-- =============================================================================
-- 권한 부여 (RLS가 행 수준 접근을 통제, service_role은 RLS 우회)
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on
  public.profiles, public.provider_credentials, public.classrooms
  to authenticated;
grant select on public.usage_daily to authenticated;
grant all on
  public.profiles, public.provider_credentials, public.classrooms,
  public.student_sessions, public.usage_daily, public.session_usage_daily
  to service_role;
grant execute on function public.consume_quota(uuid, uuid, text, integer, integer, text, date) to service_role;
grant execute on function public.record_usage_result(uuid, date, boolean) to service_role;
