Security and Access Controls

Overview
CampusArena uses Supabase Row Level Security (RLS) to strictly enforce ownership and visibility. Admin capabilities are modeled via an admin_roles table and the is_admin() SQL helper.

Core principles
- Deny by default: RLS enabled on all tables that store user data.
- Owners only: Users can read/write only their rows unless explicitly public (e.g., games, brackets).
- Admins are explicit: admin_roles plus is_admin() used in policies.
- Evidence is private: Screenshots are stored in a private bucket with signed URL access.

Key RLS policies (summary)
- profiles: anyone can read; users can insert/update only their own profile id = auth.uid().
- tournaments: public read; insert by any authenticated; update by creator or admin.
- tournament_players: public read; join/leave self while status in ('draft','open').
- matches: public read.
- match_results: involved players can read/submit; admins can update/override.
- rankings: public read; mutated via triggers on result confirmation.
- notifications: owner read/write.
- chats/messages: public read; authenticated can post.
- disputes: involved players can read/insert; admins can update.
- prizes/tournament_prizes: public read; admin manage.
- seasons/season_members: seasons are public; users can manage their membership.

Storage
- Bucket: match-screenshots (private)
  - Accept only image/* mime types; limit size to <= 5 MB in client.
  - Access images using time-limited signed URLs.
  - Consider a folder structure: match-screenshots/{tournament_id}/{match_id}/{result_id}/{filename}.
  - Optional: add a serverless function to validate uploads and virus-scan.

Automation and operations
- Auto-resolve pending results after N hours with screenshot proof (auto_resolve_pending_results).
- No-show workflow: report_no_show starts a grace period; ops job can grant auto-win after grace expires.
- Bracket progression: triggers create next-round matches when both prior winners exist (single elimination).
- Use Supabase scheduled functions/cron to:
  - call select auto_resolve_pending_results(12);
  - escalate no_show_reports whose grace_until < now().

Admin runbook
- Add or remove admins via insert/delete in admin_roles.
- Override match results by updating match_results.status to 'confirmed' and adjusting scores, if necessary.
- Manually complete tournaments via tournament_complete(uuid).
- Audit sensitive actions by inserting records into admin_audit_logs.

Notes
- All timestamps are stored in UTC.
- All primary keys are UUIDs.
- Be cautious when changing RLS policies; test with auth roles (anon, authenticated) before deploy.