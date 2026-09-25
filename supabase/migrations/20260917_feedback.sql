create extension if not exists pgcrypto;

create table if not exists public.feedback_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  player_id uuid references public.players(id) on delete set null,
  kind text not null check (kind in ('bug', 'idea')),
  title text not null,
  content text not null,
  page text,
  contact text,
  plan text,
  status text not null default 'open' check (status in ('open', 'processed')),
  issue_url text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists feedback_entries_status_idx
on public.feedback_entries (status, created_at);

alter table public.feedback_entries enable row level security;

create or replace function public.feedback_access(p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  if p_token is null or p_token = '' then
    return jsonb_build_object('allowed', false, 'plan', '');
  end if;

  select nullif(regexp_replace(coalesce(p.owner_note, ''), '^爱发电档位：', ''), '')
  into v_plan
  from sessions s
  join players p on p.id = s.player_id
  where s.token = p_token
    and s.expires_at > now();

  if v_plan is null then
    return jsonb_build_object('allowed', false, 'plan', '');
  end if;

  return jsonb_build_object(
    'allowed', v_plan in ('裂隙勘探员', '远征赞助人', '终章共创者'),
    'plan', v_plan
  );
end;
$$;

create or replace function public.submit_feedback(
  p_token text,
  p_kind text,
  p_title text,
  p_content text,
  p_page text,
  p_contact text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_plan text;
  v_kind text;
  v_title text;
  v_content text;
  v_contact text;
  v_id uuid;
begin
  v_kind := lower(trim(coalesce(p_kind, '')));
  v_title := left(trim(coalesce(p_title, '')), 80);
  v_content := left(trim(coalesce(p_content, '')), 5000);
  v_contact := left(trim(coalesce(p_contact, '')), 200);

  if v_kind not in ('bug', 'idea') then
    raise exception '反馈类型不正确';
  end if;
  if char_length(v_title) < 2 then
    raise exception '请填写反馈标题';
  end if;
  if char_length(v_content) < 5 then
    raise exception '请至少填写 5 个字的详细情况';
  end if;

  if p_token is not null and p_token <> '' then
    select p.id, nullif(regexp_replace(coalesce(p.owner_note, ''), '^爱发电档位：', ''), '')
    into v_player_id, v_plan
    from sessions s
    join players p on p.id = s.player_id
    where s.token = p_token
      and s.expires_at > now();
  end if;

  if v_kind = 'idea' and (
    v_player_id is null or
    v_plan is null or
    v_plan not in ('裂隙勘探员', '远征赞助人', '终章共创者')
  ) then
    raise exception '意见反馈仅向 12.34 元以上的爱发电档位开放';
  end if;

  insert into feedback_entries (player_id, kind, title, content, page, contact, plan)
  values (v_player_id, v_kind, v_title, v_content, left(coalesce(p_page, ''), 120), v_contact, v_plan)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.feedback_access(text) to anon;
grant execute on function public.submit_feedback(text, text, text, text, text, text) to anon;