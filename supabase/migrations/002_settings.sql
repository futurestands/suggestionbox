alter table public.suggestions drop constraint suggestions_category_check; -- categories now come from settings, validated in the Edge Function
create table public.settings (
  id int primary key default 1 check (id = 1),
  org_name text not null default 'Your Organisation', logo_url text,
  primary_color text not null default '#2563eb', secondary_color text not null default '#eff6ff',
  form_title text not null default 'SWUWS Anonymous Suggestion Box',
  intro_text text not null default 'Your voice matters. Share your concerns, ideas and recommendations confidentially.',
  privacy_notice text not null default 'We do not store your name, email, IP address or device details with your submission. Our hosting providers may process technical data, so no system can promise absolute untraceability.',
  categories jsonb not null default '["General suggestion","Work environment","Staff welfare","Management","Service delivery","Customer complaint","Ethics or misconduct","Health and safety","Other"]',
  max_message_length int not null default 5000 check (max_message_length between 100 and 5000),
  retention_months int check (retention_months >= 1),
  default_status text, default_category text);
insert into public.settings (id) values (1);
alter table public.settings enable row level security;
create policy set_read on public.settings for select to authenticated using (public.current_manager_role() is not null);
create policy set_admin on public.settings for update to authenticated using (public.current_manager_role() = 'admin') with check (public.current_manager_role() = 'admin');
create function public.public_settings() returns jsonb language sql stable security definer set search_path = public as
$$ select jsonb_build_object('org_name',org_name,'logo_url',logo_url,'primary_color',primary_color,'secondary_color',secondary_color,'form_title',form_title,'intro_text',intro_text,'privacy_notice',privacy_notice,'categories',categories,'max_message_length',max_message_length,'default_status',default_status,'default_category',default_category) from public.settings where id = 1 $$;
grant execute on function public.public_settings() to anon, authenticated;
create function public.run_retention() returns int language plpgsql security definer set search_path = public as $$
declare n int; m int;
begin
  if public.current_manager_role() is distinct from 'admin' then raise exception 'Not authorised'; end if;
  select retention_months into m from public.settings where id = 1;
  if m is null then return 0; end if;
  delete from public.suggestions where status = 'Resolved' and resolved_at < now() - make_interval(months => m);
  get diagnostics n = row_count;
  insert into public.audit_log(user_id, action) values (auth.uid(), 'retention:' || n);
  return n;
end $$;
-- Optional automation: select cron.schedule('retention','0 3 * * *','select public.run_retention_system()'); (requires a non-interactive variant; or run the button monthly)
