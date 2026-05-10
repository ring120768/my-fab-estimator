-- ===========================================================================
-- create_company_with_owner: bootstrap a new company AND owner row in one
-- transaction, bypassing the chicken-and-egg RLS problem (SELECT on companies
-- requires membership, but you can't be a member until you're inserted).
-- ===========================================================================

create or replace function public.create_company_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name)
  values (p_name)
  returning id into v_company_id;

  insert into public.company_users (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_owner(text) from public;
grant execute on function public.create_company_with_owner(text) to authenticated;
