import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { args, project, outputPath, run, probe, openScene, checkDeterminism } from './common.mjs';

const o = args(['project', 'output', 'width', 'height', 'fps', 'audio']);
const p = await project(o.project, o);
const output = await outputPath(o.output ?? 'out/demo.mp4');
run('ffmpeg', ['-version']);
if (p.audio) {
  const info = probe(p.audio);
  if (!info.streams.some(s => s.codec_type === 'audio') || Number(info.format.duration) + 0.01 < p.duration)
    throw new Error('Audio must contain at least the full film duration. Mix/pad it explicitly first.');
}
const temp = await mkdtemp(join(tmpdir(), 'motion-reel-'));
let session;
try {
  session = await openScene(p);
  await checkDeterminism(session.frame, p);
  const count = Math.round(p.duration * p.fps);
  for (let i = 0; i < count; i++) {
    await writeFile(join(temp, `${String(i).padStart(7, '0')}.png`), await session.frame(i / p.fps));
    if (i % (p.fps * 5) === 0) console.log(`Rendering ${i}/${count} frames`);
  }
  run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-framerate', String(p.fps), '-i', join(temp, '%07d.png'),
    ...(p.audio ? ['-i', p.audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'] : ['-an']),
    '-t', String(p.duration), '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
  console.log(`Rendered ${output}`);
} finally {
  await session?.browser.close();
  await rm(temp, { recursive: true, force: true });
}
