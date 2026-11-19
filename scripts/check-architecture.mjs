import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
const root = resolve('apps/api/src');
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)],
      ),
    )
  ).flat();
}
const violations = [];
for (const file of await walk(root)) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const path = relative(root, file);
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const target = match[1].startsWith('.') ? relative(root, resolve(dirname(file), match[1])) : match[1];
    if (
      path.includes('/domain/') &&
      (/\/(application|infrastructure|controllers)\//.test(target) ||
        target.startsWith('@nestjs') ||
        target.startsWith('@prisma'))
    )
      violations.push(`${path} → ${target}`);
    if (
      path.includes('/application/') &&
      (/\/(infrastructure|controllers)\//.test(target) || target.startsWith('@prisma'))
    )
      violations.push(`${path} → ${target}`);
    if (
      path.includes('/controllers/') &&
      (/\/infrastructure\//.test(target) || target.startsWith('@prisma') || target.startsWith('libs/'))
    )
      violations.push(`${path} → ${target}`);
  }
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('DDD dependency boundaries passed.');
