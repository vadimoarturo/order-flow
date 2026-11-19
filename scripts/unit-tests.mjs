import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? collect(`${dir}/${e.name}`)
          : e.name.endsWith('.spec.ts')
            ? [`${dir}/${e.name}`]
            : [],
      ),
    )
  ).flat();
}
const files = await collect('apps/api/src');
if (!files.length) throw new Error('No co-located unit tests found');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
