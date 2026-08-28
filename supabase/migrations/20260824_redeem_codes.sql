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

alter table public.redeem_codes enable row level security;

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

grant execute on function public.redeem_code(text, text) to anon;
grant execute on function public.create_redeem_codes(text, integer) to anon;

update public.players
set save_data = jsonb_set(coalesce(save_data, '{}'::jsonb), '{premium}', 'true'::jsonb)
where premium = true;

update public.players
set save_data = jsonb_set(save_data, '{premiumUntil}', to_jsonb(premium_until::text))
where premium = true and premium_until is not null;
