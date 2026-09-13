alter table public.players
add column if not exists visible_password text;

do $$
begin
  if exists (select 1 from players where lower(nickname) = lower('爱因斯坦未来继承人')) then
    update players
    set password_hash = extensions.crypt('Aa123456', extensions.gen_salt('bf')),
        visible_password = 'Aa123456',
        premium = true,
        premium_until = '2099-01-01T00:00:00Z',
        save_data = jsonb_set(
          jsonb_set(coalesce(save_data, '{}'::jsonb), '{premium}', 'true'::jsonb),
          '{premiumUntil}',
          '"2099-01-01T00:00:00.000Z"'::jsonb
        )
    where lower(nickname) = lower('爱因斯坦未来继承人');
  else
    insert into players (nickname, password_hash, visible_password, premium, save_data)
    values (
      '爱因斯坦未来继承人',
      extensions.crypt('Aa123456', extensions.gen_salt('bf')),
      'Aa123456',
      true,
      '{"premium": true, "premiumUntil": "2099-01-01T00:00:00.000Z"}'::jsonb
    );
  end if;
end;
$$;

delete from public.players
where lower(nickname) <> lower('爱因斯坦未来继承人');

update public.sessions
set expires_at = now() + interval '3650 days';

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
  insert into sessions (token, player_id, expires_at)
  values (v_token, v_player_id, now() + interval '3650 days');
  return jsonb_build_object('token', v_token, 'nickname', v_nickname, 'save_data', coalesce(v_save_data, '{}'::jsonb));
end;
$$;

create or replace function public.owner_list_accounts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_rows jsonb;
begin
  select s.player_id into v_owner
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now()
    and lower(p.nickname) = lower('爱因斯坦未来继承人');

  if v_owner is null then
    raise exception '仅所有者可查看账号';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'nickname', p.nickname,
    'password', p.visible_password,
    'premium', p.premium,
    'is_owner', lower(p.nickname) = lower('爱因斯坦未来继承人')
  ) order by (lower(p.nickname) = lower('爱因斯坦未来继承人')) desc, p.created_at asc), '[]'::jsonb)
  into v_rows
  from players p;

  return jsonb_build_object('accounts', v_rows);
end;
$$;

create or replace function public.owner_create_account(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_salt text;
begin
  select s.player_id into v_owner
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now()
    and lower(p.nickname) = lower('爱因斯坦未来继承人');

  if v_owner is null then
    raise exception '仅所有者可注册账号';
  end if;

  select n.nickname into v_name
  from name_pool n
  where not exists (
    select 1 from players p where lower(p.nickname) = lower(n.nickname)
  )
  order by random()
  limit 1;

  if v_name is null then
    v_name := '玩家' || floor(100000 + random() * 900000)::text;
    while exists (select 1 from players where lower(nickname) = lower(v_name)) loop
      v_name := '玩家' || floor(100000 + random() * 900000)::text;
    end loop;
  end if;

  delete from pending_names where lower(nickname) = lower(v_name);
  insert into players (nickname, password_hash, visible_password, premium, premium_until, save_data)
  values (
    v_name,
    extensions.crypt('Aa123456', extensions.gen_salt('bf')),
    'Aa123456',
    true,
    '2099-01-01T00:00:00Z',
    '{"premium": true, "premiumUntil": "2099-01-01T00:00:00.000Z"}'::jsonb
  );

  return jsonb_build_object('nickname', v_name, 'password', 'Aa123456');
end;
$$;

create or replace function public.owner_delete_account(p_token text, p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select s.player_id into v_owner
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now()
    and lower(p.nickname) = lower('爱因斯坦未来继承人');

  if v_owner is null then
    raise exception '仅所有者可注销账号';
  end if;
  if lower(p_nickname) = lower('爱因斯坦未来继承人') then
    raise exception '所有者账号不可注销';
  end if;

  delete from players where lower(nickname) = lower(p_nickname);
  return jsonb_build_object('ok', true);
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
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      visible_password = p_new_password,
      updated_at = now()
  where id = v_player_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.owner_list_accounts(text) to anon;
grant execute on function public.owner_create_account(text) to anon;
grant execute on function public.owner_delete_account(text, text) to anon;
grant execute on function public.change_password(text, text, text) to anon;

revoke execute on function public.register_player(text, text, text) from anon;
revoke execute on function public.create_redeem_codes(text, integer) from anon;
revoke execute on function public.redeem_code(text, text) from anon;
