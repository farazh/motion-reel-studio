import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root, run } from './common.mjs';
for (const tool of ['ffmpeg', 'ffprobe']) run(tool, ['-version']);
run(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { stdio: 'inherit' });
for (const folder of ['.agents', '.claude']) {
  const dest = join(root, folder, 'skills/motion-reel');
  await mkdir(dest, { recursive: true });
  await cp(join(root, 'skills/motion-reel'), dest, { recursive: true });
}
console.log('Chromium ready. Project-local skill installed for Codex and Claude. Rerun setup after updating the canonical skill.');
