-- Ensure authenticated users can create match chats when matches are created or updated

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'chats'
      and policyname = 'chats_insert_auth'
  ) then
    create policy chats_insert_auth on chats
    for insert with check (auth.uid() is not null);
  end if;
end$$;
