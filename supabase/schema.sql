-- ============================================================
-- Higher Education Tracker — Supabase schema
-- Run once in: Supabase dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- ── Records: one row per item (professor, university, goal, …) ─
create table if not exists public.records (
  user_id    uuid        not null default auth.uid()
             references auth.users (id) on delete cascade,
  kind       text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id),
  constraint records_kind_len check (char_length(kind) between 1 and 40),
  constraint records_id_len   check (char_length(id)   between 1 and 120)
);

-- Pull query is "my rows changed since T", so index that.
create index if not exists records_user_updated_idx
  on public.records (user_id, updated_at);

-- Server clock decides updated_at (avoids device clock skew).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch
  before insert or update on public.records
  for each row execute function public.touch_updated_at();

-- ── Row level security ───────────────────────────────────────
alter table public.records enable row level security;

revoke all on table public.records from anon, authenticated;
grant select, insert, update, delete on table public.records to authenticated;

drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;

create policy "records_select_own" on public.records
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "records_insert_own" on public.records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "records_update_own" on public.records
  for update to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "records_delete_own" on public.records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── Private file bucket (50 MB/file is the free-plan ceiling) ─
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update
  set public = false, file_size_limit = 52428800;

-- Files live at  <user id>/<doc id>/<file name>
drop policy if exists "documents_select_own" on storage.objects;
drop policy if exists "documents_insert_own" on storage.objects;
drop policy if exists "documents_update_own" on storage.objects;
drop policy if exists "documents_delete_own" on storage.objects;

create policy "documents_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Self-service account deletion ────────────────────────────
-- Records cascade from auth.users. Stored files are removed by the
-- client BEFORE calling this (storage rows can't be deleted from SQL
-- without orphaning the underlying objects).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ── Audit: this should return ZERO rows ──────────────────────
-- select schemaname, tablename from pg_tables
--  where schemaname = 'public' and not rowsecurity;
