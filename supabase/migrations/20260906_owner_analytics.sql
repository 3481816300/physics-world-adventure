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
    'save_data', coalesce(p.save_data, '{}'::jsonb),
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'is_owner', lower(p.nickname) = lower('爱因斯坦未来继承人')
  ) order by (lower(p.nickname) = lower('爱因斯坦未来继承人')) desc, p.created_at asc), '[]'::jsonb)
  into v_rows
  from players p;

  return jsonb_build_object('accounts', v_rows);
end;
$$;

grant execute on function public.owner_list_accounts(text) to anon;