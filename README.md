CampusArena

Table of Contents
- Overview
- Requirements
- Goals
- Core features
- Tech stack
- Data model (high level)
- Setup (Supabase + DB)
- Local development
- Frontend Quick Start
- UI/Frontend
- Frontend routes
- Key RPCs (cheat sheet)
- Cron jobs (recommended)
- Smoke test (post-migration)
- API testing guide (SQL)
- Performance tips
- Troubleshooting
- Architecture diagram
- Security model (RLS overview)
- Maintainer runbook
- Roadmap
- Contributing
- License

Overview
CampusArena is a competitive e-sports tournament platform for students. Players create profiles, join tournaments, play matches, submit results with proof, and climb rankings. Organizers manage formats, resolve disputes, and run events with low ops overhead.

Contact
- Maintainer: Evans Buckman
- Email: evans.buckman55@gmail.com

Requirements
- Node.js 18+ and npm 9+
- Modern browser (Chrome, Edge, Firefox, Safari) for local testing
- Supabase project with Auth and Postgres enabled

Goals
- Make it easy to organize fair, fun tournaments on campus
- Provide transparent brackets, results, and rankings
- Scale from dorm events to inter-campus cups

Core features
- Auth + Profiles (Supabase Auth, profiles table)
- Optional profile pictures (avatars) with image upload and preview
- Tournaments lifecycle: create → open → lock → start → complete
- Formats: Single Elimination; Groups → Knockout (Round Robin into bracket)
- Brackets: deterministic progression with byes handled
- Matches: result submission, confirmations, screenshots, disputes, no‑show workflow
- Rankings: points + ELO (season/game scoped)
- Notifications: in-app events (match scheduled, deadline near)
- Chat: per-match and per-tournament channels
- Admin: overrides, audit logs, prizes

Tech stack
- Backend: Supabase (Postgres + Auth + Storage), SQL RPCs/triggers, strict RLS
- Frontend: React + Tailwind (Vite)
- Hosting: Vercel (frontend), Supabase (backend)
- Storage: private bucket for screenshots and avatars (signed URLs)

Data model (high level)
- profiles, games
- tournaments, tournament_players
- matches, match_results
- rankings (season/game scoped)
- notifications, chats, chat_messages
- disputes, no_show_reports
- seasons, season_members
- groups, group_members, group_matches, group_standings
- prizes, tournament_prizes
- admin_audit_logs, webhooks

Setup (Supabase + DB)
1) Create a Supabase project
2) Open SQL editor and apply migrations in order:
   1. supabase/migrations/0001_init.sql
   2. supabase/migrations/0002_planned_improvements.sql
   3. supabase/migrations/0003_security_and_bracket_hardening.sql
   4. supabase/migrations/0004_ops_and_progression.sql
   5. supabase/migrations/0005_automation_and_storage.sql
   6. supabase/migrations/0006_automation_followups.sql
   7. supabase/migrations/0007_groups_and_knockout.sql
   8. supabase/migrations/0009_scheduling_and_reminders.sql
3) Create private Storage buckets:
   - match-screenshots (private): for match proof images
   - avatars (private): for user profile pictures
   Note: Ensure authenticated users can upload to these buckets (Storage policies). Keep buckets private and access images via signed URLs only. Limit uploads to image/* MIME types and ~5 MB for best UX.
4) Seed check: select * from games;

Local development
- Prereqs: Node 18+, npm, Supabase account (CLI optional), Git
- Clone: git clone <this-repo> && cd Campus-Arena
- Install: npm install
- Env: copy .env.example → .env.local and set:
  - VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  - VITE_SUPABASE_ANON_KEY=<anon-key>
- DB: run migrations via Supabase Studio or supabase db push
- Start frontend: npm run dev

Commands (cheatsheet)
- npm run dev           # start Vite dev server
- npm run build         # type-check then build for production
- npm run preview       # preview production build
- npm run typecheck     # TypeScript check (no emit)
- npm run lint          # lint placeholder (configure ESLint/Prettier later)

Environment management
- Development env: .env.local (not committed)
- Production env: use platform env vars (e.g., Vercel) or .env.production.local
- Required:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- After changing env vars, restart the dev server for changes to take effect.

Frontend Quick Start
- Ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- In Supabase Storage, create private buckets: match-screenshots and avatars
- Run: npm install && npm run dev
- Sign up via /signup (this creates your profile row)
- Create a tournament at /tournaments/create, then join it and start single elimination
- Submit a result to see the bracket progress and rankings update

UI/Frontend
- Styling: Tailwind CSS with reusable primitives (Button, Card, Input, Select, Avatar, Navbar)
- Responsive: mobile-first layouts with grids and flex; sticky Navbar
- Personalization: Profile page supports optional avatar upload and preview; avatars surface in Dashboard and Bracket

Frontend routes
- /: Home
- /login: Login
- /signup: Signup
- /dashboard: User dashboard with upcoming matches
- /profile: Edit profile (username, platform, optional avatar)
- /tournaments: Tournaments list
- /tournaments/create: Create a new tournament
- /tournaments/:id: Tournament detail with bracket
- /tournaments/:id/match/:matchId: Match detail
- /tournaments/:id/submit/:matchId: Submit result for a match

Key RPCs (cheat sheet)
- create_tournament(name, slug, game_id, platform, format, max_players, visibility, rules, season_id) -> uuid
- tournament_open(id), tournament_lock(id), tournament_start_single_elim(id), tournament_complete(id)
- join_tournament(id), leave_tournament(id)
- lock_and_generate_single_elim(id)
- schedule_match_deadline(match_id, scheduled_at, deadline_at, window_hours)
- report_no_show(match_id, reporter_id, reason, grace_hours)
- auto_resolve_pending_results(hours), process_expired_no_shows()
- generate_groups(tournament_id, group_count, advance_per_group)
- advance_groups_to_knockout(tournament_id, advance_per_group)

Cron jobs (recommended)
- Hourly: select auto_resolve_pending_results(12);
- Hourly: select remind_upcoming_deadlines(24);
- Every 2h: select process_expired_no_shows();

Smoke test (post-migration)
- Ensure your profiles row exists (id = auth.uid())
- Create a tournament via RPC; join with test users
- Run lock_and_generate_single_elim(t_id)
- Submit a confirmed result; verify:
  - winner_id set, status completed
  - next-round match auto-created
  - rankings updated
- Groups: generate_groups → play group_matches → advance_groups_to_knockout

API testing guide (SQL)
- List games: select id, name, slug from games order by name;
- Create tournament:
  select create_tournament('Campus Cup','campus-cup',(select id from games where slug='fc24'),'PlayStation','single_elim',8,'public',null,null);
- Open/lock/start:
  select tournament_open(<tid>);
  select tournament_lock(<tid>);
  select tournament_start_single_elim(<tid>);
- Join/leave:
  select join_tournament(<tid>);
  select leave_tournament(<tid>);
- Report and confirm result:
  insert into match_results(match_id,reported_by,score_player1,score_player2,screenshot_url,status)
  values (<match_id>, <your_uid>, 3, 1, 'https://example.com/proof.jpg', 'confirmed');
- No-show:
  select report_no_show(<match_id>, <your_uid>, 'opponent absent', 12);
  select process_expired_no_shows();
- Groups:
  select generate_groups(<tid>, 2, 2);
  -- after completing group matches:
  select advance_groups_to_knockout(<tid>, 2);

Performance tips
- Use targeted selects with pagination; avoid select * in production paths.
- Prefer RPCs for multi-step operations (bracket generation, progression) to reduce round trips.
- Ensure indexes exist for frequent filters:
  - matches(tournament_id, round_number, match_number), matches(status), matches(deadline_at)
  - tournament_players(tournament_id), rankings(profile_id, season_id, game_id)
- Store screenshots in Storage, not DB; keep only signed URLs in match_results.

Troubleshooting
- RLS: authenticate and ensure a matching profiles row; add your profile_id to admin_roles for admin tasks
- Missing function/relation: verify all migrations ran in order
- Storage: match-screenshots bucket must be private; access via signed URLs

Architecture diagram
Frontend (React/Vite) ── Supabase JS ──> Supabase (Auth + Postgres + Storage)
                                       ├─ Tables: profiles, tournaments, matches, results, rankings, ...
                                       ├─ RPCs/Functions: create_tournament, lock_and_generate_single_elim, ...
                                       ├─ Triggers: advance_winner, progress_bracket_on_match_complete, ...
                                       ├─ RLS: row ownership, admin_roles via is_admin()
                                       └─ Storage: match-screenshots (private, signed URLs)

Security model (RLS overview)
- profiles: read-all; users insert/update only their own (id = auth.uid()).
- tournaments: public read; insert authenticated; update by creator or admin (is_admin()).
- tournament_players: public read; users can join/leave themselves before lock.
- matches: public read.
- match_results: involved players can read/insert; admins can update/override.
- rankings: public read; updated via triggers on result confirmation.
- notifications: owner read/write; chats: public read, authenticated post.
- disputes: involved can read/insert; admins update/resolve.
- seasons/members and prizes/tournament_prizes: public read; admin manage.

Data privacy and security
- Screenshots and avatars are stored in private buckets and served via time-limited signed URLs.
- All sensitive write operations are enforced at the database level via RLS.
- Only authenticated users can upload to Storage; consider scanning uploads and restricting MIME types client-side.

Maintainer runbook
- Promote a user to admin:
  insert into admin_roles(profile_id, role) values ('<profile_uuid>', 'admin') on conflict (profile_id) do update set role='admin';
- Resolve a dispute (mark resolved):
  update disputes set status='resolved', updated_at=now() where id='<dispute_uuid>';
- Override a result (admin):
  update match_results set status='confirmed', score_player1=3, score_player2=0 where id='<result_uuid>';
  -- advance_winner trigger will finalize the match and progress bracket
- Force-advance a match winner (manual):
  update matches set winner_id='<profile_uuid>', status='completed' where id='<match_uuid>';
- Complete a tournament:
  select tournament_complete('<tournament_uuid>'::uuid);

Roadmap
- P0 Foundations: schema, RLS, ops
- P1 MVP Single Elim end-to-end
- P2 Double Elim + generalized bracket engine
- P3 Groups → Knockout polish (tiebreakers, seeding UI)
- P4 Integrity automation (disputes/no‑show), notifications
- P5 Profiles + Seasons + Leaderboards UX
- P6 Admin console + rollback tools
- P7 Social (chat, reactions) + moderation
- P8 Mobile/perf/observability
- P9 Monetization (prizes, sponsorships)

Contributing
- Branch from main, use Conventional Commits
  Examples:
  - feat(ui): add avatar upload to profile page
  - fix(db): handle null player2_id in bracket generator
  - docs(readme): add frontend quick start section
  - chore: bump dependencies
- Keep SQL idempotent (if exists/if not exists)
- Update README when adding migrations/RPCs

License
- MIT

Project status
- Ready for production deployment.

Build commands
- npm run typecheck
- npm run build
- npm run preview (to test the production build locally)

Finalization checklist
Database (Supabase)
- [ ] Run all migrations in order (0001 → 0009).
- [ ] Verify RLS policies allow intended reads/writes (profiles, tournaments, matches, results).
- [ ] Confirm RPCs exist and run: create_tournament, join_tournament, leave_tournament, tournament_open/lock/start/complete, lock_and_generate_single_elim, generate_groups, advance_groups_to_knockout.
- [ ] Storage buckets created (private): match-screenshots, avatars.

Storage
- [ ] Authenticated uploads permitted for both buckets (Storage policies).
- [ ] Signed URLs generated for viewing images; direct public access disabled.

Frontend
- [ ] .env.local includes VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- [ ] npm run typecheck passes, npm run build succeeds.
- [ ] UI flows tested: signup/login, profile save (including optional avatar), create/join/start tournament, submit result, bracket updates, dashboard shows upcoming, match detail accessible.

Go-Live guide
1) Staging smoke test
- Provision a staging Supabase project and Vercel environment.
- Set env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) in Vercel.
- Deploy via Vercel (“Import Project”) or git push with Vercel integration.
- Run through the smoke test in “Smoke test (post-migration)” and the Testing checklist.

2) Production setup
- Create production Supabase project, run migrations, and create Storage buckets (private).
- Set Vercel Production env vars to the production Supabase values.
- Redeploy main to production, verify routes and SPA fallback (vercel.json).

3) Post-deploy checks
- Confirm avatars and match screenshots upload and display (signed URLs).
- Validate RLS by logging in as different users (cannot read/write other users’ private data).
- Monitor logs and set alerts (optional).

Known follow-ups (post-launch roadmap)
- Double Elimination engine and advanced bracket visualization.
- Admin console with bulk operations and rollback.
- Email/push notifications (integrate with Supabase functions or third-party).
- E2E tests (Playwright/Cypress) for critical flows.
- Image validation/virus scan pipeline for uploads.