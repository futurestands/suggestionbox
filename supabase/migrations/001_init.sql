create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('General suggestion','Work environment','Staff welfare','Management','Service delivery','Customer complaint','Ethics or misconduct','Health and safety','Other')),
  subject text check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 5000),
  suggested_solution text check (char_length(suggested_solution) <= 3000),
  status text not null default 'New' check (status in ('New','Under Review','Resolved')),
  action_taken text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.suggestions (created_at desc);
create index on public.suggestions (status);

create table public.manager_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','reviewer')),
  active boolean not null default true
);
create table public.suggestion_notes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 4000),
  manager_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid, action text not null, suggestion_id uuid,
  created_at timestamptz not null default now()
);

create function public.current_manager_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.manager_roles where user_id = auth.uid() and active $$;

alter table public.suggestions enable row level security;
alter table public.suggestion_notes enable row level security;
alter table public.manager_roles enable row level security;
alter table public.audit_log enable row level security;
revoke all on all tables in schema public from anon;

-- No INSERT policy on suggestions: only the Edge Function (service role) inserts.
create policy sug_read on public.suggestions for select to authenticated using (public.current_manager_role() is not null);
create policy sug_update on public.suggestions for update to authenticated
  using (public.current_manager_role() in ('admin','manager')) with check (public.current_manager_role() in ('admin','manager'));
create policy notes_read on public.suggestion_notes for select to authenticated using (public.current_manager_role() is not null);
create policy notes_insert on public.suggestion_notes for insert to authenticated
  with check (public.current_manager_role() in ('admin','manager') and manager_id = auth.uid());
create policy roles_self on public.manager_roles for select to authenticated using (user_id = auth.uid() or public.current_manager_role() = 'admin');
create policy roles_admin on public.manager_roles for all to authenticated
  using (public.current_manager_role() = 'admin') with check (public.current_manager_role() = 'admin');
create policy audit_read on public.audit_log for select to authenticated using (public.current_manager_role() = 'admin');

-- Managers may only change workflow fields, never the submitted content.
create function public.suggestions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.message is distinct from old.message or new.category is distinct from old.category
     or new.subject is distinct from old.subject or new.suggested_solution is distinct from old.suggested_solution
     or new.created_at is distinct from old.created_at or new.id is distinct from old.id then
    raise exception 'Submitted content is immutable';
  end if;
  new.updated_at := now();
  new.resolved_at := case when new.status = 'Resolved' then coalesce(old.resolved_at, now()) else null end;
  if new.status is distinct from old.status then
    insert into public.audit_log(user_id, action, suggestion_id) values (auth.uid(), 'status:' || new.status, new.id);
  end if;
  return new;
end $$;
create trigger suggestions_guard before update on public.suggestions for each row execute function public.suggestions_guard();

-- Retention: schedule with pg_cron, e.g. delete resolved items older than 24 months.
-- select cron.schedule('retention','0 3 * * *',$$delete from public.suggestions where status='Resolved' and resolved_at < now() - interval '24 months'$$);
