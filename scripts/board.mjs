import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { args, project, outputPath, openScene } from './common.mjs';
const o = args(['project', 'output', 'times']);
const p = await project(o.project);
const times = o.times ? o.times.split(',').map(Number) : [0, .18, .36, .54, .72, .94].map(t => t * p.duration);
if (!times.length || times.some(t => !Number.isFinite(t) || t < 0 || t >= p.duration)) throw new Error('Frame times must fall within film duration');
const output = await outputPath(o.output ?? 'out/contact-sheet.png');
const session = await openScene(p);
try {
  const images = [];
  for (const t of times) images.push({ t, data: (await session.frame(t)).toString('base64') });
  await writeFile(join(dirname(output), 'poster.png'), Buffer.from(images[Math.min(1, images.length - 1)].data, 'base64'));
  const cols = Math.min(3, images.length), cellH = Math.round(300 * p.height / p.width);
  const sheet = await session.browser.newPage({ viewport: { width: cols * 300, height: Math.ceil(images.length / cols) * (cellH + 36) } });
  await sheet.setContent(`<style>body{margin:0;background:#151922;color:#fff;font:16px sans-serif}main{display:grid;grid-template-columns:repeat(${cols},300px)}figure{margin:0}img{display:block;width:300px;height:${cellH}px}figcaption{height:36px;line-height:36px;padding-left:12px}</style><main>${images.map(f => `<figure><img src="data:image/png;base64,${f.data}"><figcaption>${f.t.toFixed(2)}s</figcaption></figure>`).join('')}</main>`);
  await sheet.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  await sheet.screenshot({ path: output });
  console.log(`Wrote ${output} and poster.png`);
} finally { await session.browser.close(); }
