-- Add missing fields and fix RLS for matches table

-------------------------------------------------
-- Add missing banned column to profiles
-------------------------------------------------
alter table if exists profiles
  add column if not exists banned boolean default false;

-------------------------------------------------
-- Add missing role column to profiles
-------------------------------------------------
alter table if exists profiles
  add column if not exists role text default 'player' check (role in ('player', 'admin'));

-------------------------------------------------
-- Fix RLS for matches table to allow creation
-------------------------------------------------
alter table matches enable row level security;

-- Allow users to insert matches they are creating (player1_id = current user)
create policy "Allow users to create matches as player1"
  on matches
  for insert
  with check (player1_id = auth.uid());

-- Allow users to update matches they are involved in
create policy "Allow users to update matches they're in"
  on matches
  for update
  using (player1_id = auth.uid() or player2_id = auth.uid());

-- Allow all authenticated users to view matches they are involved in
create policy "Allow users to view their matches"
  on matches
  for select
  using (player1_id = auth.uid() or player2_id = auth.uid() or tournament_id is not null);

-------------------------------------------------
-- Fix RLS for notifications 
-------------------------------------------------
alter table notifications enable row level security;

-- Allow users to insert notifications for others
create policy "Allow inserting notifications"
  on notifications
  for insert
  with check (true);

-- Allow users to view and update their own notifications
create policy "Allow users to view their notifications"
  on notifications
  for select
  using (profile_id = auth.uid());

create policy "Allow users to update their notifications"
  on notifications
  for update
  using (profile_id = auth.uid());

-------------------------------------------------
-- Create index on matches for quick queries
-------------------------------------------------
create index if not exists idx_matches_player1 on matches(player1_id) where tournament_id is null;
create index if not exists idx_matches_player2 on matches(player2_id) where tournament_id is null;
create index if not exists idx_matches_status on matches(status);
