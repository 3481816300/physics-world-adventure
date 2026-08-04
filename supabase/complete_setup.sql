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

alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.payments enable row level security;
alter table public.name_pool enable row level security;
alter table public.pending_names enable row level security;

create or replace function public.register_player(p_nickname text, p_password text)
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

grant execute on function public.register_player(text, text) to anon;
grant execute on function public.login_player(text, text) to anon;
grant execute on function public.get_random_name() to anon;
grant execute on function public.rename_player(text, text) to anon;
grant execute on function public.change_password(text, text, text) to anon;
grant execute on function public.save_game(text, jsonb) to anon;
grant execute on function public.get_save(text) to anon;
grant execute on function public.logout_session(text) to anon;


insert into public.name_pool (nickname) values
('Ada Asimov'), ('Ada Atreides'), ('Ada Banks'), ('Ada Bradbury'), ('Ada Clarke'), ('Ada Crichton'), ('Ada Delany'), ('Ada Dick'), ('Ada Gibson'), ('Ada Herbert'), ('Ada Huxley'), ('Ada Le Guin'), ('Ada Lem'), ('Ada Lovelace'), ('Ada Niven'), ('Ada Orwell'), ('Ada Robinson'), ('Ada Shelley'), ('Ada Simmons'), ('Ada Stephenson'), ('Ada Tolkien'), ('Ada Turing'), ('Ada Verne'), ('Ada Wells'), ('Ada Zelazny'), ('Alan Asimov'), ('Alan Atreides'), ('Alan Banks'), ('Alan Bradbury'), ('Alan Clarke'), ('Alan Crichton'), ('Alan Delany'), ('Alan Dick'), ('Alan Gibson'), ('Alan Herbert'), ('Alan Huxley'), ('Alan Le Guin'), ('Alan Lem'), ('Alan Lovelace'), ('Alan Niven'), ('Alan Orwell'), ('Alan Robinson'), ('Alan Shelley'), ('Alan Simmons'), ('Alan Stephenson'), ('Alan Tolkien'), ('Alan Turing'), ('Alan Verne'), ('Alan Wells'), ('Alan Zelazny'), ('Ayla Asimov'), ('Ayla Atreides'), ('Ayla Banks'), ('Ayla Bradbury'), ('Ayla Clarke'), ('Ayla Crichton'), ('Ayla Delany'), ('Ayla Dick'), ('Ayla Gibson'), ('Ayla Herbert'), ('Ayla Huxley'), ('Ayla Le Guin'), ('Ayla Lem'), ('Ayla Lovelace'), ('Ayla Niven'), ('Ayla Orwell'), ('Ayla Robinson'), ('Ayla Shelley'), ('Ayla Simmons'), ('Ayla Stephenson'), ('Ayla Tolkien'), ('Ayla Turing'), ('Ayla Verne'), ('Ayla Wells'), ('Ayla Zelazny'), ('Beatrice Asimov'), ('Beatrice Atreides'), ('Beatrice Banks'), ('Beatrice Bradbury'), ('Beatrice Clarke'), ('Beatrice Crichton'), ('Beatrice Delany'), ('Beatrice Dick'), ('Beatrice Gibson'), ('Beatrice Herbert'), ('Beatrice Huxley'), ('Beatrice Le Guin'), ('Beatrice Lem'), ('Beatrice Lovelace'), ('Beatrice Niven'), ('Beatrice Orwell'), ('Beatrice Robinson'), ('Beatrice Shelley'), ('Beatrice Simmons'), ('Beatrice Stephenson'), ('Beatrice Tolkien'), ('Beatrice Turing'), ('Beatrice Verne'), ('Beatrice Wells'), ('Beatrice Zelazny'), ('Cale Asimov'), ('Cale Atreides'), ('Cale Banks'), ('Cale Bradbury'), ('Cale Clarke'), ('Cale Crichton'), ('Cale Delany'), ('Cale Dick'), ('Cale Gibson'), ('Cale Herbert'), ('Cale Huxley'), ('Cale Le Guin'), ('Cale Lem'), ('Cale Lovelace'), ('Cale Niven'), ('Cale Orwell'), ('Cale Robinson'), ('Cale Shelley'), ('Cale Simmons'), ('Cale Stephenson'), ('Cale Tolkien'), ('Cale Turing'), ('Cale Verne'), ('Cale Wells'), ('Cale Zelazny'), ('Cass Asimov'), ('Cass Atreides'), ('Cass Banks'), ('Cass Bradbury'), ('Cass Clarke'), ('Cass Crichton'), ('Cass Delany'), ('Cass Dick'), ('Cass Gibson'), ('Cass Herbert'), ('Cass Huxley'), ('Cass Le Guin'), ('Cass Lem'), ('Cass Lovelace'), ('Cass Niven'), ('Cass Orwell'), ('Cass Robinson'), ('Cass Shelley'), ('Cass Simmons'), ('Cass Stephenson'), ('Cass Tolkien'), ('Cass Turing'), ('Cass Verne'), ('Cass Wells'), ('Cass Zelazny'), ('Dune Asimov'), ('Dune Atreides'), ('Dune Banks'), ('Dune Bradbury'), ('Dune Clarke'), ('Dune Crichton'), ('Dune Delany'), ('Dune Dick'), ('Dune Gibson'), ('Dune Herbert'), ('Dune Huxley'), ('Dune Le Guin'), ('Dune Lem'), ('Dune Lovelace'), ('Dune Niven'), ('Dune Orwell'), ('Dune Robinson'), ('Dune Shelley'), ('Dune Simmons'), ('Dune Stephenson'), ('Dune Tolkien'), ('Dune Turing'), ('Dune Verne'), ('Dune Wells'), ('Dune Zelazny'), ('Elara Asimov'), ('Elara Atreides'), ('Elara Banks'), ('Elara Bradbury'), ('Elara Clarke'), ('Elara Crichton'), ('Elara Delany'), ('Elara Dick'), ('Elara Gibson'), ('Elara Herbert'), ('Elara Huxley'), ('Elara Le Guin'), ('Elara Lem'), ('Elara Lovelace'), ('Elara Niven'), ('Elara Orwell'), ('Elara Robinson'), ('Elara Shelley'), ('Elara Simmons'), ('Elara Stephenson'), ('Elara Tolkien'), ('Elara Turing'), ('Elara Verne'), ('Elara Wells'), ('Elara Zelazny'), ('Endo Asimov'), ('Endo Atreides'), ('Endo Banks'), ('Endo Bradbury'), ('Endo Clarke'), ('Endo Crichton'), ('Endo Delany'), ('Endo Dick'), ('Endo Gibson'), ('Endo Herbert'), ('Endo Huxley'), ('Endo Le Guin'), ('Endo Lem'), ('Endo Lovelace'), ('Endo Niven'), ('Endo Orwell'), ('Endo Robinson'), ('Endo Shelley'), ('Endo Simmons'), ('Endo Stephenson'), ('Endo Tolkien'), ('Endo Turing'), ('Endo Verne'), ('Endo Wells'), ('Endo Zelazny'), ('Faraday Asimov'), ('Faraday Atreides'), ('Faraday Banks'), ('Faraday Bradbury'), ('Faraday Clarke'), ('Faraday Crichton'), ('Faraday Delany'), ('Faraday Dick'), ('Faraday Gibson'), ('Faraday Herbert'), ('Faraday Huxley'), ('Faraday Le Guin'), ('Faraday Lem'), ('Faraday Lovelace'), ('Faraday Niven'), ('Faraday Orwell'), ('Faraday Robinson'), ('Faraday Shelley'), ('Faraday Simmons'), ('Faraday Stephenson'), ('Faraday Tolkien'), ('Faraday Turing'), ('Faraday Verne'), ('Faraday Wells'), ('Faraday Zelazny'), ('Feynman Asimov'), ('Feynman Atreides'), ('Feynman Banks'), ('Feynman Bradbury'), ('Feynman Clarke'), ('Feynman Crichton'), ('Feynman Delany'), ('Feynman Dick'), ('Feynman Gibson'), ('Feynman Herbert'), ('Feynman Huxley'), ('Feynman Le Guin'), ('Feynman Lem'), ('Feynman Lovelace'), ('Feynman Niven'), ('Feynman Orwell'), ('Feynman Robinson'), ('Feynman Shelley'), ('Feynman Simmons'), ('Feynman Stephenson'), ('Feynman Tolkien'), ('Feynman Turing'), ('Feynman Verne'), ('Feynman Wells'), ('Feynman Zelazny'), ('Gally Asimov'), ('Gally Atreides'), ('Gally Banks'), ('Gally Bradbury'), ('Gally Clarke'), ('Gally Crichton'), ('Gally Delany'), ('Gally Dick'), ('Gally Gibson'), ('Gally Herbert'), ('Gally Huxley'), ('Gally Le Guin'), ('Gally Lem'), ('Gally Lovelace'), ('Gally Niven'), ('Gally Orwell'), ('Gally Robinson'), ('Gally Shelley'), ('Gally Simmons'), ('Gally Stephenson'), ('Gally Tolkien'), ('Gally Turing'), ('Gally Verne'), ('Gally Wells'), ('Gally Zelazny'), ('Hal Asimov'), ('Hal Atreides'), ('Hal Banks'), ('Hal Bradbury'), ('Hal Clarke'), ('Hal Crichton'), ('Hal Delany'), ('Hal Dick'), ('Hal Gibson'), ('Hal Herbert'), ('Hal Huxley'), ('Hal Le Guin'), ('Hal Lem'), ('Hal Lovelace'), ('Hal Niven'), ('Hal Orwell'), ('Hal Robinson'), ('Hal Shelley'), ('Hal Simmons'), ('Hal Stephenson'), ('Hal Tolkien'), ('Hal Turing'), ('Hal Verne'), ('Hal Wells'), ('Hal Zelazny'), ('Halo Asimov'), ('Halo Atreides'), ('Halo Banks'), ('Halo Bradbury'), ('Halo Clarke'), ('Halo Crichton'), ('Halo Delany'), ('Halo Dick'), ('Halo Gibson'), ('Halo Herbert'), ('Halo Huxley'), ('Halo Le Guin'), ('Halo Lem'), ('Halo Lovelace'), ('Halo Niven'), ('Halo Orwell'), ('Halo Robinson'), ('Halo Shelley'), ('Halo Simmons'), ('Halo Stephenson'), ('Halo Tolkien'), ('Halo Turing'), ('Halo Verne'), ('Halo Wells'), ('Halo Zelazny'), ('Isa Asimov'), ('Isa Atreides'), ('Isa Banks'), ('Isa Bradbury'), ('Isa Clarke'), ('Isa Crichton'), ('Isa Delany'), ('Isa Dick'), ('Isa Gibson'), ('Isa Herbert'), ('Isa Huxley'), ('Isa Le Guin'), ('Isa Lem'), ('Isa Lovelace'), ('Isa Niven'), ('Isa Orwell'), ('Isa Robinson'), ('Isa Shelley'), ('Isa Simmons'), ('Isa Stephenson'), ('Isa Tolkien'), ('Isa Turing'), ('Isa Verne'), ('Isa Wells'), ('Isa Zelazny'), ('Jace Asimov'), ('Jace Atreides'), ('Jace Banks'), ('Jace Bradbury'), ('Jace Clarke'), ('Jace Crichton'), ('Jace Delany'), ('Jace Dick'), ('Jace Gibson'), ('Jace Herbert'), ('Jace Huxley'), ('Jace Le Guin'), ('Jace Lem'), ('Jace Lovelace'), ('Jace Niven'), ('Jace Orwell'), ('Jace Robinson'), ('Jace Shelley'), ('Jace Simmons'), ('Jace Stephenson'), ('Jace Tolkien'), ('Jace Turing'), ('Jace Verne'), ('Jace Wells'), ('Jace Zelazny'), ('Jax Asimov'), ('Jax Atreides'), ('Jax Banks'), ('Jax Bradbury'), ('Jax Clarke'), ('Jax Crichton'), ('Jax Delany'), ('Jax Dick'), ('Jax Gibson'), ('Jax Herbert'), ('Jax Huxley'), ('Jax Le Guin'), ('Jax Lem'), ('Jax Lovelace'), ('Jax Niven'), ('Jax Orwell'), ('Jax Robinson'), ('Jax Shelley'), ('Jax Simmons'), ('Jax Stephenson'), ('Jax Tolkien'), ('Jax Turing'), ('Jax Verne'), ('Jax Wells'), ('Jax Zelazny'), ('Kira Asimov'), ('Kira Atreides'), ('Kira Banks'), ('Kira Bradbury'), ('Kira Clarke'), ('Kira Crichton'), ('Kira Delany'), ('Kira Dick'), ('Kira Gibson'), ('Kira Herbert'), ('Kira Huxley'), ('Kira Le Guin'), ('Kira Lem'), ('Kira Lovelace'), ('Kira Niven'), ('Kira Orwell'), ('Kira Robinson'), ('Kira Shelley'), ('Kira Simmons'), ('Kira Stephenson'), ('Kira Tolkien'), ('Kira Turing'), ('Kira Verne'), ('Kira Wells'), ('Kira Zelazny'), ('Lena Asimov'), ('Lena Atreides'), ('Lena Banks'), ('Lena Bradbury'), ('Lena Clarke'), ('Lena Crichton'), ('Lena Delany'), ('Lena Dick'), ('Lena Gibson'), ('Lena Herbert'), ('Lena Huxley'), ('Lena Le Guin'), ('Lena Lem'), ('Lena Lovelace'), ('Lena Niven'), ('Lena Orwell'), ('Lena Robinson'), ('Lena Shelley'), ('Lena Simmons'), ('Lena Stephenson'), ('Lena Tolkien'), ('Lena Turing'), ('Lena Verne'), ('Lena Wells'), ('Lena Zelazny'), ('Lira Asimov'), ('Lira Atreides'), ('Lira Banks'), ('Lira Bradbury'), ('Lira Clarke'), ('Lira Crichton'), ('Lira Delany'), ('Lira Dick'), ('Lira Gibson'), ('Lira Herbert'), ('Lira Huxley'), ('Lira Le Guin'), ('Lira Lem'), ('Lira Lovelace'), ('Lira Niven'), ('Lira Orwell'), ('Lira Robinson'), ('Lira Shelley'), ('Lira Simmons'), ('Lira Stephenson'), ('Lira Tolkien'), ('Lira Turing'), ('Lira Verne'), ('Lira Wells'), ('Lira Zelazny'), ('Maya Asimov'), ('Maya Atreides'), ('Maya Banks'), ('Maya Bradbury'), ('Maya Clarke'), ('Maya Crichton'), ('Maya Delany'), ('Maya Dick'), ('Maya Gibson'), ('Maya Herbert'), ('Maya Huxley'), ('Maya Le Guin'), ('Maya Lem'), ('Maya Lovelace'), ('Maya Niven'), ('Maya Orwell'), ('Maya Robinson'), ('Maya Shelley'), ('Maya Simmons'), ('Maya Stephenson'), ('Maya Tolkien'), ('Maya Turing'), ('Maya Verne'), ('Maya Wells'), ('Maya Zelazny'), ('Naya Asimov'), ('Naya Atreides'), ('Naya Banks'), ('Naya Bradbury'), ('Naya Clarke'), ('Naya Crichton'), ('Naya Delany'), ('Naya Dick'), ('Naya Gibson'), ('Naya Herbert'), ('Naya Huxley'), ('Naya Le Guin'), ('Naya Lem'), ('Naya Lovelace'), ('Naya Niven'), ('Naya Orwell'), ('Naya Robinson'), ('Naya Shelley'), ('Naya Simmons'), ('Naya Stephenson'), ('Naya Tolkien'), ('Naya Turing'), ('Naya Verne'), ('Naya Wells'), ('Naya Zelazny'), ('Nova Asimov'), ('Nova Atreides'), ('Nova Banks'), ('Nova Bradbury'), ('Nova Clarke'), ('Nova Crichton'), ('Nova Delany'), ('Nova Dick'), ('Nova Gibson'), ('Nova Herbert'), ('Nova Huxley'), ('Nova Le Guin'), ('Nova Lem'), ('Nova Lovelace'), ('Nova Niven'), ('Nova Orwell'), ('Nova Robinson'), ('Nova Shelley'), ('Nova Simmons'), ('Nova Stephenson'), ('Nova Tolkien'), ('Nova Turing'), ('Nova Verne'), ('Nova Wells'), ('Nova Zelazny'), ('Odo Asimov'), ('Odo Atreides'), ('Odo Banks'), ('Odo Bradbury'), ('Odo Clarke'), ('Odo Crichton'), ('Odo Delany'), ('Odo Dick'), ('Odo Gibson'), ('Odo Herbert'), ('Odo Huxley'), ('Odo Le Guin'), ('Odo Lem'), ('Odo Lovelace'), ('Odo Niven'), ('Odo Orwell'), ('Odo Robinson'), ('Odo Shelley'), ('Odo Simmons'), ('Odo Stephenson'), ('Odo Tolkien'), ('Odo Turing'), ('Odo Verne'), ('Odo Wells'), ('Odo Zelazny'), ('Orion Asimov'), ('Orion Atreides'), ('Orion Banks'), ('Orion Bradbury'), ('Orion Clarke'), ('Orion Crichton'), ('Orion Delany'), ('Orion Dick'), ('Orion Gibson'), ('Orion Herbert'), ('Orion Huxley'), ('Orion Le Guin'), ('Orion Lem'), ('Orion Lovelace'), ('Orion Niven'), ('Orion Orwell'), ('Orion Robinson'), ('Orion Shelley'), ('Orion Simmons'), ('Orion Stephenson'), ('Orion Tolkien'), ('Orion Turing'), ('Orion Verne'), ('Orion Wells'), ('Orion Zelazny'), ('Pax Asimov'), ('Pax Atreides'), ('Pax Banks'), ('Pax Bradbury'), ('Pax Clarke'), ('Pax Crichton'), ('Pax Delany'), ('Pax Dick'), ('Pax Gibson'), ('Pax Herbert'), ('Pax Huxley'), ('Pax Le Guin'), ('Pax Lem'), ('Pax Lovelace'), ('Pax Niven'), ('Pax Orwell'), ('Pax Robinson'), ('Pax Shelley'), ('Pax Simmons'), ('Pax Stephenson'), ('Pax Tolkien'), ('Pax Turing'), ('Pax Verne'), ('Pax Wells'), ('Pax Zelazny'), ('Quill Asimov'), ('Quill Atreides'), ('Quill Banks'), ('Quill Bradbury'), ('Quill Clarke'), ('Quill Crichton'), ('Quill Delany'), ('Quill Dick'), ('Quill Gibson'), ('Quill Herbert'), ('Quill Huxley'), ('Quill Le Guin'), ('Quill Lem'), ('Quill Lovelace'), ('Quill Niven'), ('Quill Orwell'), ('Quill Robinson'), ('Quill Shelley'), ('Quill Simmons'), ('Quill Stephenson'), ('Quill Tolkien'), ('Quill Turing'), ('Quill Verne'), ('Quill Wells'), ('Quill Zelazny'), ('Raven Asimov'), ('Raven Atreides'), ('Raven Banks'), ('Raven Bradbury'), ('Raven Clarke'), ('Raven Crichton'), ('Raven Delany'), ('Raven Dick'), ('Raven Gibson'), ('Raven Herbert'), ('Raven Huxley'), ('Raven Le Guin'), ('Raven Lem'), ('Raven Lovelace'), ('Raven Niven'), ('Raven Orwell'), ('Raven Robinson'), ('Raven Shelley'), ('Raven Simmons'), ('Raven Stephenson'), ('Raven Tolkien'), ('Raven Turing'), ('Raven Verne'), ('Raven Wells'), ('Raven Zelazny'), ('Rhea Asimov'), ('Rhea Atreides'), ('Rhea Banks'), ('Rhea Bradbury'), ('Rhea Clarke'), ('Rhea Crichton'), ('Rhea Delany'), ('Rhea Dick'), ('Rhea Gibson'), ('Rhea Herbert'), ('Rhea Huxley'), ('Rhea Le Guin'), ('Rhea Lem'), ('Rhea Lovelace'), ('Rhea Niven'), ('Rhea Orwell'), ('Rhea Robinson'), ('Rhea Shelley'), ('Rhea Simmons'), ('Rhea Stephenson'), ('Rhea Tolkien'), ('Rhea Turing'), ('Rhea Verne'), ('Rhea Wells'), ('Rhea Zelazny'), ('Ripley Asimov'), ('Ripley Atreides'), ('Ripley Banks'), ('Ripley Bradbury'), ('Ripley Clarke'), ('Ripley Crichton'), ('Ripley Delany'), ('Ripley Dick'), ('Ripley Gibson'), ('Ripley Herbert'), ('Ripley Huxley'), ('Ripley Le Guin'), ('Ripley Lem'), ('Ripley Lovelace'), ('Ripley Niven'), ('Ripley Orwell'), ('Ripley Robinson'), ('Ripley Shelley'), ('Ripley Simmons'), ('Ripley Stephenson'), ('Ripley Tolkien'), ('Ripley Turing'), ('Ripley Verne'), ('Ripley Wells'), ('Ripley Zelazny'), ('Sagan Asimov'), ('Sagan Atreides'), ('Sagan Banks'), ('Sagan Bradbury'), ('Sagan Clarke'), ('Sagan Crichton'), ('Sagan Delany'), ('Sagan Dick'), ('Sagan Gibson'), ('Sagan Herbert'), ('Sagan Huxley'), ('Sagan Le Guin'), ('Sagan Lem'), ('Sagan Lovelace'), ('Sagan Niven'), ('Sagan Orwell'), ('Sagan Robinson'), ('Sagan Shelley'), ('Sagan Simmons'), ('Sagan Stephenson'), ('Sagan Tolkien'), ('Sagan Turing'), ('Sagan Verne'), ('Sagan Wells'), ('Sagan Zelazny'), ('Sera Asimov'), ('Sera Atreides'), ('Sera Banks'), ('Sera Bradbury'), ('Sera Clarke'), ('Sera Crichton'), ('Sera Delany'), ('Sera Dick'), ('Sera Gibson'), ('Sera Herbert'), ('Sera Huxley'), ('Sera Le Guin'), ('Sera Lem'), ('Sera Lovelace'), ('Sera Niven'), ('Sera Orwell'), ('Sera Robinson'), ('Sera Shelley'), ('Sera Simmons'), ('Sera Stephenson'), ('Sera Tolkien'), ('Sera Turing'), ('Sera Verne'), ('Sera Wells'), ('Sera Zelazny'), ('Shepard Asimov'), ('Shepard Atreides'), ('Shepard Banks'), ('Shepard Bradbury'), ('Shepard Clarke'), ('Shepard Crichton'), ('Shepard Delany'), ('Shepard Dick'), ('Shepard Gibson'), ('Shepard Herbert'), ('Shepard Huxley'), ('Shepard Le Guin'), ('Shepard Lem'), ('Shepard Lovelace'), ('Shepard Niven'), ('Shepard Orwell'), ('Shepard Robinson'), ('Shepard Shelley'), ('Shepard Simmons'), ('Shepard Stephenson'), ('Shepard Tolkien'), ('Shepard Turing'), ('Shepard Verne'), ('Shepard Wells'), ('Shepard Zelazny'), ('Spock Asimov'), ('Spock Atreides'), ('Spock Banks'), ('Spock Bradbury'), ('Spock Clarke'), ('Spock Crichton'), ('Spock Delany'), ('Spock Dick'), ('Spock Gibson'), ('Spock Herbert'), ('Spock Huxley'), ('Spock Le Guin'), ('Spock Lem'), ('Spock Lovelace'), ('Spock Niven'), ('Spock Orwell'), ('Spock Robinson'), ('Spock Shelley'), ('Spock Simmons'), ('Spock Stephenson'), ('Spock Tolkien'), ('Spock Turing'), ('Spock Verne'), ('Spock Wells'), ('Spock Zelazny'), ('Tessa Asimov'), ('Tessa Atreides'), ('Tessa Banks'), ('Tessa Bradbury'), ('Tessa Clarke'), ('Tessa Crichton'), ('Tessa Delany'), ('Tessa Dick'), ('Tessa Gibson'), ('Tessa Herbert'), ('Tessa Huxley'), ('Tessa Le Guin'), ('Tessa Lem'), ('Tessa Lovelace'), ('Tessa Niven'), ('Tessa Orwell'), ('Tessa Robinson'), ('Tessa Shelley'), ('Tessa Simmons'), ('Tessa Stephenson'), ('Tessa Tolkien'), ('Tessa Turing'), ('Tessa Verne'), ('Tessa Wells'), ('Tessa Zelazny'), ('Vega Asimov'), ('Vega Atreides'), ('Vega Banks'), ('Vega Bradbury'), ('Vega Clarke'), ('Vega Crichton'), ('Vega Delany'), ('Vega Dick'), ('Vega Gibson'), ('Vega Herbert'), ('Vega Huxley'), ('Vega Le Guin'), ('Vega Lem'), ('Vega Lovelace'), ('Vega Niven'), ('Vega Orwell'), ('Vega Robinson'), ('Vega Shelley'), ('Vega Simmons'), ('Vega Stephenson'), ('Vega Tolkien'), ('Vega Turing'), ('Vega Verne'), ('Vega Wells'), ('Vega Zelazny'), ('Vex Asimov'), ('Vex Atreides'), ('Vex Banks'), ('Vex Bradbury'), ('Vex Clarke'), ('Vex Crichton'), ('Vex Delany'), ('Vex Dick'), ('Vex Gibson'), ('Vex Herbert'), ('Vex Huxley'), ('Vex Le Guin'), ('Vex Lem'), ('Vex Lovelace'), ('Vex Niven'), ('Vex Orwell'), ('Vex Robinson'), ('Vex Shelley'), ('Vex Simmons'), ('Vex Stephenson'), ('Vex Tolkien'), ('Vex Turing'), ('Vex Verne'), ('Vex Wells'), ('Vex Zelazny'), ('Wren Asimov'), ('Wren Atreides'), ('Wren Banks'), ('Wren Bradbury'), ('Wren Clarke'), ('Wren Crichton'), ('Wren Delany'), ('Wren Dick'), ('Wren Gibson'), ('Wren Herbert'), ('Wren Huxley'), ('Wren Le Guin'), ('Wren Lem'), ('Wren Lovelace'), ('Wren Niven'), ('Wren Orwell'), ('Wren Robinson'), ('Wren Shelley'), ('Wren Simmons'), ('Wren Stephenson'), ('Wren Tolkien'), ('Wren Turing'), ('Wren Verne'), ('Wren Wells'), ('Wren Zelazny'), ('Xander Asimov'), ('Xander Atreides'), ('Xander Banks'), ('Xander Bradbury'), ('Xander Clarke'), ('Xander Crichton'), ('Xander Delany'), ('Xander Dick'), ('Xander Gibson'), ('Xander Herbert'), ('Xander Huxley'), ('Xander Le Guin'), ('Xander Lem'), ('Xander Lovelace'), ('Xander Niven'), ('Xander Orwell'), ('Xander Robinson'), ('Xander Shelley'), ('Xander Simmons'), ('Xander Stephenson'), ('Xander Tolkien'), ('Xander Turing'), ('Xander Verne'), ('Xander Wells'), ('Xander Zelazny'), ('Yara Asimov'), ('Yara Atreides'), ('Yara Banks'), ('Yara Bradbury'), ('Yara Clarke'), ('Yara Crichton'), ('Yara Delany'), ('Yara Dick'), ('Yara Gibson'), ('Yara Herbert'), ('Yara Huxley'), ('Yara Le Guin'), ('Yara Lem'), ('Yara Lovelace'), ('Yara Niven'), ('Yara Orwell'), ('Yara Robinson'), ('Yara Shelley'), ('Yara Simmons'), ('Yara Stephenson'), ('Yara Tolkien'), ('Yara Turing'), ('Yara Verne'), ('Yara Wells'), ('Yara Zelazny')
on conflict (nickname) do nothing;

