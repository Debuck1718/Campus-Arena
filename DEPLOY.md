CampusArena Deployment Guide

Prerequisites
- Supabase project (PROD) with all SQL migrations applied (0001 → 0009).
- Storage buckets (private): match-screenshots, avatars.
- Vercel account (or any static host) and repo connected.

Environment variables (Vercel → Project Settings → Environment Variables)
- VITE_SUPABASE_URL = https://<project-ref>.supabase.co
- VITE_SUPABASE_ANON_KEY = <anon key>
Note: Do NOT commit real secrets to the repo. Use Vercel env vars for production.

Build steps (local test)
- npm ci
- npm run typecheck
- npm run build
- npm run preview  # http://localhost:4173

Deploy (Vercel)
1) Import GitHub repo into Vercel.
2) Set env vars for Production (and Preview if desired).
3) Build command: npm run build
4) Output dir: dist (Vercel auto-detects for Vite)
5) vercel.json is provided with SPA rewrites (no legacy "builds" key).
6) Deploy main branch.

If you see "Build 'src' is 'index.html' but expected 'package.json'":
- Ensure vercel.json does NOT include a "builds" section pointing to index.html (we removed it).
- Ensure package.json with scripts is at repo root and contains "build": "tsc -b && vite build".

Post-deploy smoke test
- Visit: /, /login, /signup, /tournaments, /dashboard, 404 (bad path), /privacy, /terms.
- Sign up, create your profile, upload avatar.
- Create tournament → join with another account → start single elimination → submit result.
- Check bracket progresses and dashboard shows upcoming.
- Confirm images load via signed URLs; direct public access is denied.

Notes
- Service worker (public/sw.js) is a minimal stub; extend for offline later.
- Manifest (public/manifest.webmanifest) allows install-to-home-screen on mobile.
- For issues, run: npm run typecheck and npm run lint.