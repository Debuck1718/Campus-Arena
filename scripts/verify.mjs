#!/usr/bin/env node
/*
 * Verification harness for CampusArena.
 *
 * Why: this machine's OneDrive folder silently drops files from node_modules
 * (typescript's lib.dom.d.ts and lucide-react's declarations both go missing),
 * so `npm run typecheck` cannot run in place. We mirror the project to a temp
 * dir outside OneDrive, install the real dependency set there from the registry,
 * then run tsc + eslint + a production build against the real sources.
 *
 * There is deliberately NO `declare module 'lucide-react'` shim. An earlier
 * version stubbed the module to work around the missing .d.ts, but that made
 * every icon import typecheck as `any` -- so a renamed or removed icon export
 * passed silently. The types are available now that we install from the
 * registry, and that blind spot is closed.
 *
 * Usage: node scripts/verify.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.cwd();
const TMP = path.join(os.tmpdir(), 'campus-arena-verify');

function sleep(ms) {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function runCmd(file, args, cwd) {
  try {
    return execFileSync(file, args, {
      cwd,
      shell: true,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (err) {
    throw new Error((err.stdout || '') + (err.stderr || '') || String(err));
  }
}

function run(args, cwd) {
  return execFileSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024
  });
}

function mirror() {
  fs.mkdirSync(TMP, { recursive: true });

  const items = ['src', 'package.json', 'tsconfig.json', '.eslintrc.cjs', 'tailwind.config.js'];

  for (const rel of items) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(TMP, rel), { recursive: true, force: true });
  }

  // node_modules is not mirrored from the project at all.
  //
  // Two reasons:
  //  1. The project's own node_modules lives on OneDrive, where unhydrated
  //     cloud files make reads fail ("UNKNOWN: unknown error, read") and copies
  //     die with errno 426 ("cloud operation ... time-out"). Every package the
  //     checks need is re-installed from the registry instead, into a plain
  //     temp dir, which is fast and reliable.
  //  2. tsc and eslint resolve only what they load, so a full mirror is wasted
  //     work anyway.
  const nmDst = path.join(TMP, 'node_modules');
  fs.mkdirSync(TMP, { recursive: true });

  const stamp = path.join(TMP, '.pkgs.json');
  const want = JSON.stringify(depSpec());
  const have = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : '';

  if (have !== want || !depsIntact(nmDst)) {
    install(nmDst);
    if (!depsIntact(nmDst))
      throw new Error('npm install produced a corrupt dependency tree in ' + nmDst);
    fs.writeFileSync(stamp, want);
  }
}

// npm install in %TEMP% can be interrupted by antivirus scanners, leaving
// individual files zeroed or truncated. That shows up as a baffling eslint
// crash ("Invalid or unexpected token" in a rule file), so verify a few of the
// files eslint actually requires before trusting the cache.
function depsIntact(nm) {
  const probes = [
    'eslint/bin/eslint.js',
    'eslint/lib/rules/one-var-declaration-per-line.js',
    'eslint/lib/rules/index.js',
    'typescript/lib/tsc.js',
    // Proves the real lucide declarations are present, so the typecheck is not
    // silently falling back to an untyped/shimmed module.
    'lucide-react/dist/lucide-react.d.ts',
    'react/package.json'
  ];

  for (const rel of probes) {
    const f = path.join(nm, rel);
    try {
      const buf = fs.readFileSync(f);
      // NUL bytes mean the write was interrupted mid-file.
      if (buf.length === 0 || buf.includes(0)) return false;
    } catch {
      return false;
    }
  }

  return true;
}

/*
 * The app's own dependencies are needed too, not just the lint toolchain:
 * tsc must resolve the real `lucide-react` / `react` / `@supabase` types for
 * the typecheck to mean anything, and vite needs them to prove the bundle
 * builds. We install from the project's own package.json so the temp tree can
 * never drift from what the app actually depends on.
 */
function depSpec() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const names = Object.keys(all).sort();

  // Tools the harness drives directly must exist even if the project stops
  // listing them as direct deps.
  for (const extra of ['typescript', 'eslint', 'vite']) {
    if (!names.includes(extra)) names.push(extra);
  }

  return names.map((n) => n + '@' + (all[n] || 'latest'));
}

function install(nm) {
  fs.rmSync(nm, { recursive: true, force: true });
  fs.mkdirSync(nm, { recursive: true });
  fs.writeFileSync(
    path.join(nm, 'package.json'),
    JSON.stringify({ name: 'ca-verify-deps', private: true }, null, 2)
  );
  runCmd('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', ...depSpec()], TMP);
}

function typecheck() {
  console.log('--- typecheck ---');

  const tsc = path.join(TMP, 'node_modules', 'typescript', 'lib', 'tsc.js');

  try {
    run([tsc, '--noEmit', '--pretty', 'false'], TMP);
    console.log('typecheck: PASS (0 errors)');
    return true;
  } catch (err) {
    console.log('typecheck: FAIL');
    console.log((err.stdout || '') + (err.stderr || ''));
    return false;
  }
}

/*
 * The production build is the only check that catches an import which typechecks
 * but does not resolve at bundle time. It also proves the icon exports we now
 * typecheck for real are actually exported by the shipped lucide build.
 */
function build() {
  console.log('--- build ---');

  const vite = path.join(TMP, 'node_modules', 'vite', 'bin', 'vite.js');

  for (const rel of ['index.html', 'postcss.config.js', 'vite.config.ts', 'vite.config.js']) {
    const src = path.join(ROOT, rel);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(TMP, rel), { force: true });
  }

  const srcDir = path.join(ROOT, 'src');
  if (fs.existsSync(srcDir))
    fs.cpSync(srcDir, path.join(TMP, 'src'), { recursive: true, force: true });
  const pub = path.join(ROOT, 'public');
  if (fs.existsSync(pub))
    fs.cpSync(pub, path.join(TMP, 'public'), { recursive: true, force: true });

  try {
    run([vite, 'build', '--logLevel', 'warn'], TMP);
    console.log('build:      PASS');
    return true;
  } catch (err) {
    console.log('build:      FAIL');
    console.log(((err.stdout || '') + (err.stderr || '')).slice(-4000));
    return false;
  }
}

function lint() {
  console.log('--- lint ---');

  const eslint = path.join(TMP, 'node_modules', 'eslint', 'bin', 'eslint.js');

  let out = '';

  // Antivirus occasionally holds a freshly-unpacked rule file open, which makes
  // eslint's lazy rule loader die with EBUSY / "Cannot find module". These are
  // transient and clear within a second or two, so retry rather than reporting
  // a spurious FAIL.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      out = run([eslint, 'src', '--ext', '.ts,.tsx'], TMP);
      break;
    } catch (err) {
      out = (err.stdout || '') + (err.stderr || '');
      const transient = /EBUSY|UNKNOWN: unknown error|Cannot find module/.test(out);
      if (!transient || attempt === 3) break;
      console.log('lint: transient error, retrying (' + attempt + '/3)...');
      sleep(1500);
    }
  }

  // eslint exits 1 when there are warnings only; that is still a pass for us.
  if (/0 errors/.test(out) || out.trim() === '') {
    // eslint only prints "0 errors" in its ✖ summary line, so take the count
    // from that same line rather than from a stray "N warnings fixable".
    const summary = out.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s*(\d+)\s+warnings?\)/);
    const warn = summary ? summary[3] : '0';
    console.log('lint:      PASS (0 errors, ' + warn + ' warnings)');
    return true;
  }

  console.log('lint:      FAIL');
  console.log(out.slice(-4000));
  return false;
}

mirror();

const tscOk = typecheck();
const lintOk = lint();
const buildOk = build();

console.log('');
console.log('================ SUMMARY ================');
console.log('typecheck: ' + (tscOk ? 'PASS' : 'FAIL'));
console.log('lint:      ' + (lintOk ? 'PASS' : 'FAIL'));
console.log('build:     ' + (buildOk ? 'PASS' : 'FAIL'));

process.exit(tscOk && lintOk && buildOk ? 0 : 1);
