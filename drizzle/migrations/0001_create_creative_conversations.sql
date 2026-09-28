create table if not exists public.creative_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_conversations_user_updated_idx
  on public.creative_conversations (user_id, updated_at desc);

grant select, insert, update, delete on public.creative_conversations to authenticated;
grant all on public.creative_conversations to service_role;

alter table public.creative_conversations enable row level security;

create policy "users_select_own_conversations"
  on public.creative_conversations for select to authenticated
  using (auth.uid() = user_id);

create policy "users_insert_own_conversations"
  on public.creative_conversations for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users_update_own_conversations"
  on public.creative_conversations for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_delete_own_conversations"
  on public.creative_conversations for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_creative_conversations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creative_conversations_updated_at on public.creative_conversations;
create trigger set_creative_conversations_updated_at
  before update on public.creative_conversations
  for each row execute function public.set_creative_conversations_updated_at();