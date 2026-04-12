-- =====================================================
-- Run this in Supabase → SQL Editor
-- This creates the tables to store projects permanently
-- =====================================================

-- Projects table
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  opened_date   text not null,
  expected_close text not null,
  owner         text not null,
  status        text not null default 'Pending',
  priority      text not null default 'Medium',
  created_at    timestamp with time zone default now(),
  updated_at    timestamp with time zone default now()
);

-- Comments table
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  by_name    text not null,
  text       text not null,
  created_at timestamp with time zone default now()
);

-- Allow all logged-in users to read and write
alter table projects enable row level security;
alter table comments enable row level security;

create policy "Authenticated users can do everything on projects"
  on projects for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can do everything on comments"
  on comments for all
  to authenticated
  using (true)
  with check (true);
