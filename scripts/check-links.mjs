#!/usr/bin/env node
// Verify every declared dependency is a symlink into the local @ximera source
// tree, and that each linked package's own dependencies still resolve.
//
// A plain `npm install` silently replaces these links with registry tarballs,
// so run this (or `npm run relink`) if a build starts using stale component code.
import { readFileSync, existsSync, realpathSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const SOURCE = '/home/jim/@ximera';

const deps = Object.keys(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies);
const problems = [];

for (const name of deps) {
  const dir = path.join(root, 'node_modules', name);

  if (!existsSync(path.join(dir, 'package.json'))) {
    problems.push(`${name}: not installed`);
    continue;
  }

  const real = realpathSync(dir);
  if (!real.startsWith(SOURCE + path.sep)) {
    problems.push(`${name}: NOT linked — resolves to ${real}`);
    continue;
  }

  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const require_ = createRequire(path.join(dir, 'package.json'));
  const missing = Object.keys(pkg.dependencies ?? {}).filter((d) => {
    try { require_.resolve(`${d}/package.json`); return false; }
    catch { try { require_.resolve(d); return false; } catch { return true; } }
  });
  if (missing.length) problems.push(`${name}: unresolved deps — ${missing.join(', ')}`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} link problem(s):`);
  for (const p of problems) console.error(`    ${p}`);
  console.error('\nRun `npm run relink` to repair.');
  process.exit(1);
}
console.log(`✓ all ${deps.length} dependencies linked to ${SOURCE} and fully resolvable`);
