import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { args, root } from './common.mjs';
const o = args(['name']);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.name ?? '')) throw new Error('Use --name lowercase-hyphenated-name');
const dir = join(root, 'films', o.name);
await mkdir(dir); // refuse to overwrite an existing film
await copyFile(join(root, 'films/demo/index.html'), join(dir, 'index.html'));
await writeFile(join(dir, 'film.json'), JSON.stringify({ title: o.name, width: 1080, height: 1920, fps: 60, duration: 20, scene: 'index.html', audio: null, lufs: -16 }, null, 2) + '\n');
await writeFile(join(dir, 'brief.md'), `# ${o.name}\n\n## Brief\nAudience, message, duration, formats, CTA, references and audio preference.\n\n## Assets and claims\nRecord file origins, usage rights, and evidence for product claims.\n\n## Shot list\nTimestamp, visual action, copy, transition and sound cue.\n\n## Review\nTimestamped issues, fixes and remaining limitations.\n`);
console.log(`Created films/${o.name}. Edit the brief, config and scene; put your media alongside the scene.`);
