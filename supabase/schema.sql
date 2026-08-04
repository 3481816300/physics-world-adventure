create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text unique not null check (char_length(nickname) between 1 and 16),
  password_hash text not null,
  save_data jsonb not null default '{}'::jsonb,
  premium boolean not null default false,
  premium_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists players_nickname_idx on public.players (nickname);

alter table public.players enable row level security;

-- 演示阶段先允许读取玩家昵称，正式上线建议使用 Supabase Edge Function，
-- 不要把 service_role 密钥放进前端。
create policy "players_readable" on public.players
  for select using (true);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  provider text not null,
  provider_payment_id text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists payments_player_idx on public.payments (player_id);

alter table public.payments enable row level security;
