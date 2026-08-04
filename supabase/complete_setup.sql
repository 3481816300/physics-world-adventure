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


delete from public.name_pool;
insert into public.name_pool (nickname) values
('丁一帆'), ('丁仪'), ('丁倩'), ('丁冬'), ('丁北海'), ('丁华'), ('丁启'), ('丁培强'), ('丁天明'), ('丁宝库'), ('丁强'), ('丁心'), ('丁恒'), ('丁文洁'), ('丁星'), ('丁星辰'), ('丁朵朵'), ('丁梦'), ('丁淼'), ('丁澜'), ('丁磊'), ('丁维德'), ('丁航'), ('丁辑'), ('丁远'), ('严一帆'), ('严仪'), ('严倩'), ('严冬'), ('严北海'), ('严华'), ('严启'), ('严培强'), ('严天明'), ('严宝库'), ('严强'), ('严心'), ('严恒'), ('严文洁'), ('严星'), ('严星辰'), ('严朵朵'), ('严梦'), ('严淼'), ('严澜'), ('严磊'), ('严维德'), ('严航'), ('严辑'), ('严远'), ('云一帆'), ('云仪'), ('云倩'), ('云冬'), ('云北海'), ('云华'), ('云启'), ('云培强'), ('云天明'), ('云宝库'), ('云强'), ('云心'), ('云恒'), ('云文洁'), ('云星'), ('云星辰'), ('云朵朵'), ('云梦'), ('云淼'), ('云澜'), ('云磊'), ('云维德'), ('云航'), ('云辑'), ('云远'), ('何一帆'), ('何仪'), ('何倩'), ('何冬'), ('何北海'), ('何华'), ('何启'), ('何培强'), ('何天明'), ('何宝库'), ('何强'), ('何心'), ('何恒'), ('何文洁'), ('何星'), ('何星辰'), ('何朵朵'), ('何梦'), ('何淼'), ('何澜'), ('何磊'), ('何维德'), ('何航'), ('何辑'), ('何远'), ('关一帆'), ('关仪'), ('关倩'), ('关冬'), ('关北海'), ('关华'), ('关启'), ('关培强'), ('关天明'), ('关宝库'), ('关强'), ('关心'), ('关恒'), ('关文洁'), ('关星'), ('关星辰'), ('关朵朵'), ('关梦'), ('关淼'), ('关澜'), ('关磊'), ('关维德'), ('关航'), ('关辑'), ('关远'), ('冯一帆'), ('冯仪'), ('冯倩'), ('冯冬'), ('冯北海'), ('冯华'), ('冯启'), ('冯培强'), ('冯天明'), ('冯宝库'), ('冯强'), ('冯心'), ('冯恒'), ('冯文洁'), ('冯星'), ('冯星辰'), ('冯朵朵'), ('冯梦'), ('冯淼'), ('冯澜'), ('冯磊'), ('冯维德'), ('冯航'), ('冯辑'), ('冯远'), ('刘一帆'), ('刘仪'), ('刘倩'), ('刘冬'), ('刘北海'), ('刘华'), ('刘启'), ('刘培强'), ('刘天明'), ('刘宝库'), ('刘强'), ('刘心'), ('刘恒'), ('刘文洁'), ('刘星'), ('刘星辰'), ('刘朵朵'), ('刘梦'), ('刘淼'), ('刘澜'), ('刘磊'), ('刘维德'), ('刘航'), ('刘辑'), ('刘远'), ('华一帆'), ('华仪'), ('华倩'), ('华冬'), ('华北海'), ('华华'), ('华启'), ('华培强'), ('华天明'), ('华宝库'), ('华强'), ('华心'), ('华恒'), ('华文洁'), ('华星'), ('华星辰'), ('华朵朵'), ('华梦'), ('华淼'), ('华澜'), ('华磊'), ('华维德'), ('华航'), ('华辑'), ('华远'), ('卫一帆'), ('卫仪'), ('卫倩'), ('卫冬'), ('卫北海'), ('卫华'), ('卫启'), ('卫培强'), ('卫天明'), ('卫宝库'), ('卫强'), ('卫心'), ('卫恒'), ('卫文洁'), ('卫星'), ('卫星辰'), ('卫朵朵'), ('卫梦'), ('卫淼'), ('卫澜'), ('卫磊'), ('卫维德'), ('卫航'), ('卫辑'), ('卫远'), ('史一帆'), ('史仪'), ('史倩'), ('史冬'), ('史北海'), ('史华'), ('史启'), ('史培强'), ('史天明'), ('史宝库'), ('史强'), ('史心'), ('史恒'), ('史文洁'), ('史星'), ('史星辰'), ('史朵朵'), ('史梦'), ('史淼'), ('史澜'), ('史磊'), ('史维德'), ('史航'), ('史辑'), ('史远'), ('叶一帆'), ('叶仪'), ('叶倩'), ('叶冬'), ('叶北海'), ('叶华'), ('叶启'), ('叶培强'), ('叶天明'), ('叶宝库'), ('叶强'), ('叶心'), ('叶恒'), ('叶文洁'), ('叶星'), ('叶星辰'), ('叶朵朵'), ('叶梦'), ('叶淼'), ('叶澜'), ('叶磊'), ('叶维德'), ('叶航'), ('叶辑'), ('叶远'), ('吴一帆'), ('吴仪'), ('吴倩'), ('吴冬'), ('吴北海'), ('吴华'), ('吴启'), ('吴培强'), ('吴天明'), ('吴宝库'), ('吴强'), ('吴心'), ('吴恒'), ('吴文洁'), ('吴星'), ('吴星辰'), ('吴朵朵'), ('吴梦'), ('吴淼'), ('吴澜'), ('吴磊'), ('吴维德'), ('吴航'), ('吴辑'), ('吴远'), ('周一帆'), ('周仪'), ('周倩'), ('周冬'), ('周北海'), ('周华'), ('周启'), ('周培强'), ('周天明'), ('周宝库'), ('周强'), ('周心'), ('周恒'), ('周文洁'), ('周星'), ('周星辰'), ('周朵朵'), ('周梦'), ('周淼'), ('周澜'), ('周磊'), ('周维德'), ('周航'), ('周辑'), ('周远'), ('孙一帆'), ('孙仪'), ('孙倩'), ('孙冬'), ('孙北海'), ('孙华'), ('孙启'), ('孙培强'), ('孙天明'), ('孙宝库'), ('孙强'), ('孙心'), ('孙恒'), ('孙文洁'), ('孙星'), ('孙星辰'), ('孙朵朵'), ('孙梦'), ('孙淼'), ('孙澜'), ('孙磊'), ('孙维德'), ('孙航'), ('孙辑'), ('孙远'), ('希一帆'), ('希仪'), ('希倩'), ('希冬'), ('希北海'), ('希华'), ('希启'), ('希培强'), ('希天明'), ('希宝库'), ('希强'), ('希心'), ('希恒'), ('希文洁'), ('希星'), ('希星辰'), ('希朵朵'), ('希梦'), ('希淼'), ('希澜'), ('希磊'), ('希维德'), ('希航'), ('希辑'), ('希远'), ('常一帆'), ('常仪'), ('常倩'), ('常冬'), ('常北海'), ('常华'), ('常启'), ('常培强'), ('常天明'), ('常宝库'), ('常强'), ('常心'), ('常恒'), ('常文洁'), ('常星'), ('常星辰'), ('常朵朵'), ('常梦'), ('常淼'), ('常澜'), ('常磊'), ('常维德'), ('常航'), ('常辑'), ('常远'), ('李一帆'), ('李仪'), ('李倩'), ('李冬'), ('李北海'), ('李华'), ('李启'), ('李培强'), ('李天明'), ('李宝库'), ('李强'), ('李心'), ('李恒'), ('李文洁'), ('李星'), ('李星辰'), ('李朵朵'), ('李梦'), ('李淼'), ('李澜'), ('李磊'), ('李维德'), ('李航'), ('李辑'), ('李远'), ('杨一帆'), ('杨仪'), ('杨倩'), ('杨冬'), ('杨北海'), ('杨华'), ('杨启'), ('杨培强'), ('杨天明'), ('杨宝库'), ('杨强'), ('杨心'), ('杨恒'), ('杨文洁'), ('杨星'), ('杨星辰'), ('杨朵朵'), ('杨梦'), ('杨淼'), ('杨澜'), ('杨磊'), ('杨维德'), ('杨航'), ('杨辑'), ('杨远'), ('林一帆'), ('林仪'), ('林倩'), ('林冬'), ('林北海'), ('林华'), ('林启'), ('林培强'), ('林天明'), ('林宝库'), ('林强'), ('林心'), ('林恒'), ('林文洁'), ('林星'), ('林星辰'), ('林朵朵'), ('林梦'), ('林淼'), ('林澜'), ('林磊'), ('林维德'), ('林航'), ('林辑'), ('林远'), ('江一帆'), ('江仪'), ('江倩'), ('江冬'), ('江北海'), ('江华'), ('江启'), ('江培强'), ('江天明'), ('江宝库'), ('江强'), ('江心'), ('江恒'), ('江文洁'), ('江星'), ('江星辰'), ('江朵朵'), ('江梦'), ('江淼'), ('江澜'), ('江磊'), ('江维德'), ('江航'), ('江辑'), ('江远'), ('汪一帆'), ('汪仪'), ('汪倩'), ('汪冬'), ('汪北海'), ('汪华'), ('汪启'), ('汪培强'), ('汪天明'), ('汪宝库'), ('汪强'), ('汪心'), ('汪恒'), ('汪文洁'), ('汪星'), ('汪星辰'), ('汪朵朵'), ('汪梦'), ('汪淼'), ('汪澜'), ('汪磊'), ('汪维德'), ('汪航'), ('汪辑'), ('汪远'), ('沈一帆'), ('沈仪'), ('沈倩'), ('沈冬'), ('沈北海'), ('沈华'), ('沈启'), ('沈培强'), ('沈天明'), ('沈宝库'), ('沈强'), ('沈心'), ('沈恒'), ('沈文洁'), ('沈星'), ('沈星辰'), ('沈朵朵'), ('沈梦'), ('沈淼'), ('沈澜'), ('沈磊'), ('沈维德'), ('沈航'), ('沈辑'), ('沈远'), ('王一帆'), ('王仪'), ('王倩'), ('王冬'), ('王北海'), ('王华'), ('王启'), ('王培强'), ('王天明'), ('王宝库'), ('王强'), ('王心'), ('王恒'), ('王文洁'), ('王星'), ('王星辰'), ('王朵朵'), ('王梦'), ('王淼'), ('王澜'), ('王磊'), ('王维德'), ('王航'), ('王辑'), ('王远'), ('秦一帆'), ('秦仪'), ('秦倩'), ('秦冬'), ('秦北海'), ('秦华'), ('秦启'), ('秦培强'), ('秦天明'), ('秦宝库'), ('秦强'), ('秦心'), ('秦恒'), ('秦文洁'), ('秦星'), ('秦星辰'), ('秦朵朵'), ('秦梦'), ('秦淼'), ('秦澜'), ('秦磊'), ('秦维德'), ('秦航'), ('秦辑'), ('秦远'), ('程一帆'), ('程仪'), ('程倩'), ('程冬'), ('程北海'), ('程华'), ('程启'), ('程培强'), ('程天明'), ('程宝库'), ('程强'), ('程心'), ('程恒'), ('程文洁'), ('程星'), ('程星辰'), ('程朵朵'), ('程梦'), ('程淼'), ('程澜'), ('程磊'), ('程维德'), ('程航'), ('程辑'), ('程远'), ('章一帆'), ('章仪'), ('章倩'), ('章冬'), ('章北海'), ('章华'), ('章启'), ('章培强'), ('章天明'), ('章宝库'), ('章强'), ('章心'), ('章恒'), ('章文洁'), ('章星'), ('章星辰'), ('章朵朵'), ('章梦'), ('章淼'), ('章澜'), ('章磊'), ('章维德'), ('章航'), ('章辑'), ('章远'), ('维一帆'), ('维仪'), ('维倩'), ('维冬'), ('维北海'), ('维华'), ('维启'), ('维培强'), ('维天明'), ('维宝库'), ('维强'), ('维心'), ('维恒'), ('维文洁'), ('维星'), ('维星辰'), ('维朵朵'), ('维梦'), ('维淼'), ('维澜'), ('维磊'), ('维维德'), ('维航'), ('维辑'), ('维远'), ('罗一帆'), ('罗仪'), ('罗倩'), ('罗冬'), ('罗北海'), ('罗华'), ('罗启'), ('罗培强'), ('罗天明'), ('罗宝库'), ('罗强'), ('罗心'), ('罗恒'), ('罗文洁'), ('罗星'), ('罗星辰'), ('罗朵朵'), ('罗梦'), ('罗淼'), ('罗澜'), ('罗磊'), ('罗维德'), ('罗航'), ('罗辑'), ('罗远'), ('艾一帆'), ('艾仪'), ('艾倩'), ('艾冬'), ('艾北海'), ('艾华'), ('艾启'), ('艾培强'), ('艾天明'), ('艾宝库'), ('艾强'), ('艾心'), ('艾恒'), ('艾文洁'), ('艾星'), ('艾星辰'), ('艾朵朵'), ('艾梦'), ('艾淼'), ('艾澜'), ('艾磊'), ('艾维德'), ('艾航'), ('艾辑'), ('艾远'), ('苏一帆'), ('苏仪'), ('苏倩'), ('苏冬'), ('苏北海'), ('苏华'), ('苏启'), ('苏培强'), ('苏天明'), ('苏宝库'), ('苏强'), ('苏心'), ('苏恒'), ('苏文洁'), ('苏星'), ('苏星辰'), ('苏朵朵'), ('苏梦'), ('苏淼'), ('苏澜'), ('苏磊'), ('苏维德'), ('苏航'), ('苏辑'), ('苏远'), ('蒋一帆'), ('蒋仪'), ('蒋倩'), ('蒋冬'), ('蒋北海'), ('蒋华'), ('蒋启'), ('蒋培强'), ('蒋天明'), ('蒋宝库'), ('蒋强'), ('蒋心'), ('蒋恒'), ('蒋文洁'), ('蒋星'), ('蒋星辰'), ('蒋朵朵'), ('蒋梦'), ('蒋淼'), ('蒋澜'), ('蒋磊'), ('蒋维德'), ('蒋航'), ('蒋辑'), ('蒋远'), ('褚一帆'), ('褚仪'), ('褚倩'), ('褚冬'), ('褚北海'), ('褚华'), ('褚启'), ('褚培强'), ('褚天明'), ('褚宝库'), ('褚强'), ('褚心'), ('褚恒'), ('褚文洁'), ('褚星'), ('褚星辰'), ('褚朵朵'), ('褚梦'), ('褚淼'), ('褚澜'), ('褚磊'), ('褚维德'), ('褚航'), ('褚辑'), ('褚远'), ('许一帆'), ('许仪'), ('许倩'), ('许冬'), ('许北海'), ('许华'), ('许启'), ('许培强'), ('许天明'), ('许宝库'), ('许强'), ('许心'), ('许恒'), ('许文洁'), ('许星'), ('许星辰'), ('许朵朵'), ('许梦'), ('许淼'), ('许澜'), ('许磊'), ('许维德'), ('许航'), ('许辑'), ('许远'), ('赵一帆'), ('赵仪'), ('赵倩'), ('赵冬'), ('赵北海'), ('赵华'), ('赵启'), ('赵培强'), ('赵天明'), ('赵宝库'), ('赵强'), ('赵心'), ('赵恒'), ('赵文洁'), ('赵星'), ('赵星辰'), ('赵朵朵'), ('赵梦'), ('赵淼'), ('赵澜'), ('赵磊'), ('赵维德'), ('赵航'), ('赵辑'), ('赵远'), ('郑一帆'), ('郑仪'), ('郑倩'), ('郑冬'), ('郑北海'), ('郑华'), ('郑启'), ('郑培强'), ('郑天明'), ('郑宝库'), ('郑强'), ('郑心'), ('郑恒'), ('郑文洁'), ('郑星'), ('郑星辰'), ('郑朵朵'), ('郑梦'), ('郑淼'), ('郑澜'), ('郑磊'), ('郑维德'), ('郑航'), ('郑辑'), ('郑远'), ('陆一帆'), ('陆仪'), ('陆倩'), ('陆冬'), ('陆北海'), ('陆华'), ('陆启'), ('陆培强'), ('陆天明'), ('陆宝库'), ('陆强'), ('陆心'), ('陆恒'), ('陆文洁'), ('陆星'), ('陆星辰'), ('陆朵朵'), ('陆梦'), ('陆淼'), ('陆澜'), ('陆磊'), ('陆维德'), ('陆航'), ('陆辑'), ('陆远'), ('陈一帆'), ('陈仪'), ('陈倩'), ('陈冬'), ('陈北海'), ('陈华'), ('陈启'), ('陈培强'), ('陈天明'), ('陈宝库'), ('陈强'), ('陈心'), ('陈恒'), ('陈文洁'), ('陈星'), ('陈星辰'), ('陈朵朵'), ('陈梦'), ('陈淼'), ('陈澜'), ('陈磊'), ('陈维德'), ('陈航'), ('陈辑'), ('陈远'), ('雷一帆'), ('雷仪'), ('雷倩'), ('雷冬'), ('雷北海'), ('雷华'), ('雷启'), ('雷培强'), ('雷天明'), ('雷宝库'), ('雷强'), ('雷心'), ('雷恒'), ('雷文洁'), ('雷星'), ('雷星辰'), ('雷朵朵'), ('雷梦'), ('雷淼'), ('雷澜'), ('雷磊'), ('雷维德'), ('雷航'), ('雷辑'), ('雷远'), ('韩一帆'), ('韩仪'), ('韩倩'), ('韩冬'), ('韩北海'), ('韩华'), ('韩启'), ('韩培强'), ('韩天明'), ('韩宝库'), ('韩强'), ('韩心'), ('韩恒'), ('韩文洁'), ('韩星'), ('韩星辰'), ('韩朵朵'), ('韩梦'), ('韩淼'), ('韩澜'), ('韩磊'), ('韩维德'), ('韩航'), ('韩辑'), ('韩远'), ('马一帆'), ('马仪'), ('马倩'), ('马冬'), ('马北海'), ('马华'), ('马启'), ('马培强'), ('马天明'), ('马宝库'), ('马强'), ('马心'), ('马恒'), ('马文洁'), ('马星'), ('马星辰'), ('马朵朵'), ('马梦'), ('马淼'), ('马澜'), ('马磊'), ('马维德'), ('马航'), ('马辑'), ('马远')
on conflict (nickname) do nothing;

