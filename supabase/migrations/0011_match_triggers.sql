-- Trigger to ensure a match-scoped chat exists and to emit notifications
create extension if not exists "pgcrypto";

create or replace function ensure_match_chat_and_notify()
returns trigger language plpgsql as $$
begin
  -- On insert: create chat and notify player1
  if (TG_OP = 'INSERT') then
    if not exists (select 1 from chats where match_id = NEW.id) then
      insert into chats(scope, match_id) values('match', NEW.id);
    end if;
    if NEW.player1_id is not null then
      insert into notifications(profile_id, type, payload) values (NEW.player1_id, 'challenge_created', jsonb_build_object('match_id', NEW.id, 'by', NEW.player1_id));
    end if;
    return NEW;
  end if;

  -- On update: if player2 was just set, create chat and notify both players
  if (TG_OP = 'UPDATE') then
    if (OLD.player2_id is null and NEW.player2_id is not null) then
      if not exists (select 1 from chats where match_id = NEW.id) then
        insert into chats(scope, match_id) values('match', NEW.id);
      end if;
      if NEW.player1_id is not null then
        insert into notifications(profile_id, type, payload) values (NEW.player1_id, 'challenge_accepted', jsonb_build_object('match_id', NEW.id, 'by', NEW.player2_id));
      end if;
      if NEW.player2_id is not null then
        insert into notifications(profile_id, type, payload) values (NEW.player2_id, 'challenge_accepted', jsonb_build_object('match_id', NEW.id, 'by', NEW.player2_id));
      end if;
    end if;
    return NEW;
  end if;

  return NEW;
end$$;

drop trigger if exists match_chat_notify_trigger on matches;
create trigger match_chat_notify_trigger
after insert or update on matches
for each row execute function ensure_match_chat_and_notify();
