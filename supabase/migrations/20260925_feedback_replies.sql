alter table public.feedback_entries
  add column if not exists reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references public.players(id) on delete set null,
  add column if not exists user_seen_at timestamptz;

create or replace function public.feedback_access(p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_plan text;
  v_unread integer := 0;
begin
  if p_token is null or p_token = '' then
    return jsonb_build_object('allowed', false, 'plan', '', 'unread', 0);
  end if;

  select p.id,
         nullif(regexp_replace(coalesce(p.owner_note, ''), '^爱发电档位：', ''), '')
  into v_player_id, v_plan
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now();

  if v_player_id is null then
    return jsonb_build_object('allowed', false, 'plan', '', 'unread', 0);
  end if;

  select count(*) into v_unread
  from feedback_entries
  where player_id = v_player_id
    and reply is not null
    and user_seen_at is null;

  return jsonb_build_object(
    'allowed', coalesce(v_plan in ('裂隙勘探员', '远征赞助人', '终章共创者'), false),
    'plan', coalesce(v_plan, ''),
    'unread', v_unread
  );
end;
$$;

create or replace function public.list_my_feedback(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_rows jsonb;
begin
  select p.id into v_player_id
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'kind', kind,
    'title', title,
    'content', content,
    'page', page,
    'status', case when reply is not null then 'replied' else status end,
    'reply', reply,
    'replied_at', replied_at,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v_rows
  from feedback_entries
  where player_id = v_player_id;

  return jsonb_build_object('entries', v_rows);
end;
$$;

create or replace function public.mark_feedback_seen(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select p.id into v_player_id
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now();

  if v_player_id is null then
    raise exception '登录已失效';
  end if;

  update feedback_entries
  set user_seen_at = now()
  where player_id = v_player_id
    and reply is not null
    and user_seen_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.owner_list_feedback(p_token text)
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
    raise exception '仅所有者可查看反馈';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'nickname', coalesce(p.nickname, '游客'),
    'kind', f.kind,
    'title', f.title,
    'content', f.content,
    'page', f.page,
    'contact', f.contact,
    'plan', f.plan,
    'status', case when f.reply is not null then 'replied' else f.status end,
    'reply', f.reply,
    'replied_at', f.replied_at,
    'created_at', f.created_at,
    'issue_url', f.issue_url
  ) order by case when f.reply is null then 0 else 1 end, f.created_at desc), '[]'::jsonb)
  into v_rows
  from feedback_entries f
  left join players p on p.id = f.player_id;

  return jsonb_build_object('entries', v_rows);
end;
$$;

create or replace function public.owner_reply_feedback(p_token text, p_feedback_id uuid, p_reply text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_reply text;
begin
  select s.player_id into v_owner
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now()
    and lower(p.nickname) = lower('爱因斯坦未来继承人');

  if v_owner is null then
    raise exception '仅所有者可回复反馈';
  end if;

  v_reply := left(trim(coalesce(p_reply, '')), 5000);
  if char_length(v_reply) < 2 then
    raise exception '请填写回复内容';
  end if;

  update feedback_entries
  set reply = v_reply,
      replied_at = now(),
      replied_by = v_owner,
      user_seen_at = null,
      status = 'processed'
  where id = p_feedback_id;

  if not found then
    raise exception '反馈不存在';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.feedback_access(text) to anon;
grant execute on function public.list_my_feedback(text) to anon;
grant execute on function public.mark_feedback_seen(text) to anon;
grant execute on function public.owner_list_feedback(text) to anon;
grant execute on function public.owner_reply_feedback(text, uuid, text) to anon;