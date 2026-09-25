create table if not exists public.feedback_digest_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);

alter table public.feedback_digest_tokens enable row level security;

create or replace function public.feedback_digest(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entries jsonb;
begin
  if not exists (select 1 from feedback_digest_tokens where token = p_token) then
    raise exception '反馈汇总令牌无效';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'kind', kind,
    'title', title,
    'content', content,
    'page', page,
    'contact', contact,
    'plan', plan,
    'created_at', created_at
  ) order by created_at asc), '[]'::jsonb)
  into v_entries
  from feedback_entries
  where status = 'open';

  return jsonb_build_object('entries', v_entries);
end;
$$;

create or replace function public.feedback_digest_complete(
  p_token text,
  p_ids uuid[],
  p_issue_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from feedback_digest_tokens where token = p_token) then
    raise exception '反馈汇总令牌无效';
  end if;

  update feedback_entries
  set status = 'processed',
      processed_at = now(),
      issue_url = left(coalesce(p_issue_url, ''), 500)
  where id = any(p_ids)
    and status = 'open';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.feedback_digest(text) to anon;
grant execute on function public.feedback_digest_complete(text, uuid[], text) to anon;