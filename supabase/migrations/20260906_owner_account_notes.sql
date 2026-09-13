alter table public.players
add column if not exists owner_note text;

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
    'owner_note', coalesce(p.owner_note, ''),
    'is_owner', lower(p.nickname) = lower('爱因斯坦未来继承人')
  ) order by (lower(p.nickname) = lower('爱因斯坦未来继承人')) desc, p.created_at asc), '[]'::jsonb)
  into v_rows
  from players p;

  return jsonb_build_object('accounts', v_rows);
end;
$$;

drop function if exists public.owner_create_account(text);
drop function if exists public.owner_create_account(text, text);

create or replace function public.owner_create_account(p_token text, p_plan text default '法则同行者')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
  v_plan text;
  v_premium boolean;
begin
  select s.player_id into v_owner
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now()
    and lower(p.nickname) = lower('爱因斯坦未来继承人');

  if v_owner is null then
    raise exception '仅所有者可创建账号';
  end if;

  v_plan := coalesce(nullif(trim(p_plan), ''), '法则同行者');
  v_premium := v_plan <> '星尘观测者';

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
  insert into players (
    nickname,
    password_hash,
    visible_password,
    premium,
    premium_until,
    owner_note,
    save_data
  )
  values (
    v_name,
    extensions.crypt('Aa123456', extensions.gen_salt('bf')),
    'Aa123456',
    v_premium,
    case when v_premium then '2099-01-01T00:00:00Z'::timestamptz else null end,
    '爱发电档位：' || v_plan,
    case
      when v_premium then '{"premium": true, "premiumUntil": "2099-01-01T00:00:00.000Z"}'::jsonb
      else '{}'::jsonb
    end
  );

  return jsonb_build_object(
    'nickname', v_name,
    'password', 'Aa123456',
    'plan', v_plan,
    'premium', v_premium
  );
end;
$$;
create or replace function public.owner_update_note(p_token text, p_nickname text, p_note text)
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
    raise exception '仅所有者可修改备注';
  end if;

  update players
  set owner_note = left(coalesce(p_note, ''), 500),
      updated_at = now()
  where lower(nickname) = lower(p_nickname);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.owner_update_note(text, text, text) to anon;
grant execute on function public.owner_create_account(text, text) to anon;
