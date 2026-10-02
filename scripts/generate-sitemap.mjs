#!/usr/bin/env node
/*
 * Generates public/sitemap.xml at build time.
 *
 * Why a generator instead of a checked-in file: the canonical host lives in
 * VITE_SITE_URL, so hard-coding it would go stale the moment the domain
 * changes (or between preview and production deploys). This reads the same
 * env var the app uses and writes absolute URLs accordingly.
 *
 * Only publicly indexable routes are listed. Authenticated routes
 * (dashboard, matches, submit, profile, support, admin) are deliberately
 * excluded -- they redirect anonymous crawlers to /login and are marked
 * noindex by the SEO component.
 *
 * If Supabase credentials are present, live tournaments are appended as
 * /tournaments/<id> so bracket pages get discovered too. Without credentials
 * (or on any network error) it degrades to the static route list rather than
 * failing the build.
 *
 * Usage: node scripts/generate-sitemap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'sitemap.xml');

const SITE_URL = (process.env.VITE_SITE_URL || 'https://campus-arena.vercel.app').replace(
  /\/+$/,
  ''
);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

/** Public routes with a priority hint (1.0 = most important). */
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/tournaments', priority: '0.9', changefreq: 'daily' },
  { path: '/leaderboard', priority: '0.8', changefreq: 'daily' },
  { path: '/signup', priority: '0.7', changefreq: 'monthly' },
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' }
];

const escapeXml = (value) =>
  String(value).replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  );

async function fetchTournamentRoutes() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('[sitemap] No Supabase credentials in env — skipping dynamic tournament routes.');
    return [];
  }
  try {
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/tournaments?select=id,created_at&order=created_at.desc&limit=2000`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    console.log(`[sitemap] Added ${rows.length} tournament route(s).`);
    return rows
      .filter((row) => row && typeof row.id === 'string')
      .map((row) => ({
        path: `/tournaments/${row.id}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : undefined
      }));
  } catch (err) {
    console.warn(
      `[sitemap] Could not fetch tournaments (${err.message}) — continuing with static routes.`
    );
    return [];
  }
}

function buildXml(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map((route) => {
      const loc = escapeXml(`${SITE_URL}${route.path}`);
      const lastmod = escapeXml(route.lastmod || today);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority}</priority>`,
        '  </url>'
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const routes = [...STATIC_ROUTES, ...(await fetchTournamentRoutes())];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buildXml(routes), 'utf8');
console.log(`[sitemap] Wrote ${routes.length} URL(s) to public/sitemap.xml (site: ${SITE_URL}).`);
