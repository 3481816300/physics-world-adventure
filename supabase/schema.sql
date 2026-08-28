create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 16),
  password_hash text not null,
  save_data jsonb not null default '{}'::jsonb,
  premium boolean not null default false,
  premium_until timestamptz,
  default_name text,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists players_nickname_lower_idx on public.players (lower(nickname));

create table if not exists public.name_pool (
  nickname text primary key
);

create table if not exists public.pending_names (
  nickname text primary key,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create table if not exists public.sessions (
  token text primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days'
);

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

create table if not exists public.redeem_codes (
  code text primary key,
  amount numeric not null default 9.90,
  status text not null default 'unused' check (status in ('unused', 'used', 'disabled')),
  consumed_by uuid references public.players(id) on delete set null,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists redeem_codes_status_idx on public.redeem_codes (status);

alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.payments enable row level security;
alter table public.redeem_codes enable row level security;
alter table public.name_pool enable row level security;
alter table public.pending_names enable row level security;

create or replace function public.register_player(p_nickname text, p_password text, p_admin_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_token text;
  v_is_default boolean;
begin
  if p_admin_password is null or p_admin_password <> 'HarryLI@20120622' then
    raise exception '仅管理员模式可注册账号';
  end if;
  if char_length(p_nickname) < 1 or char_length(p_nickname) > 16 then
    raise exception '昵称不能为空，最多16字';
  end if;
  if char_length(p_password) < 4 then
    raise exception '密码至少4位';
  end if;
  if exists (select 1 from players where lower(nickname) = lower(p_nickname)) then
    raise exception '该账号已存在，请重新输入';
  end if;
  if exists (select 1 from pending_names where lower(nickname) = lower(p_nickname) and expires_at > now()) then
    raise exception '该账号已存在，请重新输入';
  end if;

  delete from pending_names where lower(nickname) = lower(p_nickname);
  v_is_default := exists (select 1 from name_pool where lower(nickname) = lower(p_nickname));

  insert into players (nickname, password_hash, default_name, assigned_at)
  values (
    p_nickname,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when v_is_default then p_nickname else null end,
    case when v_is_default then now() else null end
  )
  returning id into v_player_id;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into sessions (token, player_id) values (v_token, v_player_id);
  return jsonb_build_object('token', v_token, 'nickname', p_nickname, 'save_data', '{}'::jsonb);
end;
$$;

create or replace function public.login_player(p_nickname text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_password_hash text;
  v_save_data jsonb;
  v_nickname text;
  v_token text;
begin
  select id, nickname, password_hash, save_data
  into v_player_id, v_nickname, v_password_hash, v_save_data
  from players
  where lower(nickname) = lower(p_nickname);

  if v_player_id is null or v_password_hash <> extensions.crypt(p_password, v_password_hash) then
    raise exception '昵称或密码不正确';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into sessions (token, player_id) values (v_token, v_player_id);
  return jsonb_build_object('token', v_token, 'nickname', v_nickname, 'save_data', coalesce(v_save_data, '{}'::jsonb));
end;
$$;

create or replace function public.get_random_name()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select n.nickname into v_name
  from name_pool n
  where not exists (
    select 1 from players p where lower(p.nickname) = lower(n.nickname)
  )
  and not exists (
    select 1 from pending_names q
    where lower(q.nickname) = lower(n.nickname)
      and q.expires_at > now()
  )
  order by random()
  limit 1;

  if v_name is null then
    return null;
  end if;

  delete from pending_names where lower(nickname) = lower(v_name);
  insert into pending_names (nickname) values (v_name);
  return jsonb_build_object('nickname', v_name);
end;
$$;

create or replace function public.rename_player(p_token text, p_new_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_created_at timestamptz;
begin
  select s.player_id, p.created_at into v_player_id, v_created_at
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;
  if now() - v_created_at > interval '30 minutes' then
    raise exception '注册超过30分钟，无法修改昵称';
  end if;
  if char_length(p_new_nickname) < 1 or char_length(p_new_nickname) > 16 then
    raise exception '昵称不能为空，最多16字';
  end if;
  if exists (select 1 from players where lower(nickname) = lower(p_new_nickname)) then
    raise exception '该账号已存在，请重新输入';
  end if;

  update players
  set nickname = p_new_nickname, default_name = null, updated_at = now()
  where id = v_player_id;

  return jsonb_build_object('nickname', p_new_nickname);
end;
$$;

create or replace function public.change_password(p_token text, p_old_password text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_password_hash text;
begin
  select s.player_id, p.password_hash into v_player_id, v_password_hash
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;
  if v_password_hash <> extensions.crypt(p_old_password, v_password_hash) then
    raise exception '原密码不正确';
  end if;
  if char_length(p_new_password) < 4 then
    raise exception '新密码至少4位';
  end if;

  update players
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = now()
  where id = v_player_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.save_game(p_token text, p_save_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select s.player_id into v_player_id
  from sessions s
  where s.token = p_token and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;

  update players
  set save_data = coalesce(p_save_data, '{}'::jsonb), updated_at = now()
  where id = v_player_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_save(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_save_data jsonb;
begin
  select p.save_data into v_save_data
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token and s.expires_at > now();

  if v_save_data is null then
    raise exception '登录已失效';
  end if;

  return v_save_data;
end;
$$;

create or replace function public.logout_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from sessions where token = p_token;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.redeem_code(p_token text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_code text;
  v_redeem redeem_codes%rowtype;
  v_until timestamptz;
begin
  select s.player_id into v_player_id
  from sessions s
  where s.token = p_token and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;

  v_code := upper(regexp_replace(trim(p_code), '\s+', '', 'g'));
  select * into v_redeem
  from redeem_codes
  where code = v_code
  for update;

  if v_redeem.code is null or v_redeem.status <> 'unused'
    or (v_redeem.expires_at is not null and v_redeem.expires_at <= now()) then
    raise exception '兑换码无效或已被使用';
  end if;

  v_until := now() + interval '1 year';
  update redeem_codes
  set status = 'used',
      consumed_by = v_player_id,
      consumed_at = now()
  where code = v_code;

  update players
  set premium = true,
      premium_until = v_until,
      save_data = jsonb_set(
        jsonb_set(coalesce(save_data, '{}'::jsonb), '{premium}', 'true'::jsonb),
        '{premiumUntil}',
        to_jsonb(v_until::text)
      ),
      updated_at = now()
  where id = v_player_id;

  return jsonb_build_object(
    'ok', true,
    'premium', true,
    'premium_until', v_until,
    'redeemed_code', v_code
  );
end;
$$;

create or replace function public.create_redeem_codes(p_admin_password text, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes jsonb := '[]'::jsonb;
  v_code text;
  v_i integer;
begin
  if p_admin_password is null or p_admin_password <> 'HarryLI@20120622' then
    raise exception '仅管理员模式可生成兑换码';
  end if;

  v_i := greatest(1, least(coalesce(p_quantity, 1), 50));
  while jsonb_array_length(v_codes) < v_i loop
    v_code := 'WL-'
      || upper(encode(extensions.gen_random_bytes(3), 'hex')) || '-'
      || upper(encode(extensions.gen_random_bytes(3), 'hex')) || '-'
      || upper(encode(extensions.gen_random_bytes(3), 'hex'));
    if not exists (select 1 from redeem_codes where code = v_code) then
      insert into redeem_codes (code, amount) values (v_code, 9.90);
      v_codes := v_codes || jsonb_build_array(v_code);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'codes', v_codes);
end;
$$;

grant execute on function public.register_player(text, text, text) to anon;
grant execute on function public.login_player(text, text) to anon;
grant execute on function public.get_random_name() to anon;
grant execute on function public.rename_player(text, text) to anon;
grant execute on function public.change_password(text, text, text) to anon;
grant execute on function public.save_game(text, jsonb) to anon;
grant execute on function public.get_save(text) to anon;
grant execute on function public.logout_session(text) to anon;
grant execute on function public.redeem_code(text, text) to anon;
grant execute on function public.create_redeem_codes(text, integer) to anon;
