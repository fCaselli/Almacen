import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await walk(full));
    else if (extname(full) === '.js' || extname(full) === '.mjs') files.push(full);
  }
  return files;
}

const files = await walk(new URL('../src', import.meta.url).pathname);
for (const file of files) {
  await execFileAsync(process.execPath, ['--check', file]);
}
console.log(`Checked ${files.length} source files.`);
