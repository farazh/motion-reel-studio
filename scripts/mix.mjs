import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { args, outputPath, run } from './common.mjs';
const o = args(['cues', 'output']);
if (!o.cues || !o.output) throw new Error('--cues and --output are required');
const file = resolve(o.cues), cues = JSON.parse(await readFile(file, 'utf8'));
const duration = cues.duration, lufs = cues.lufs ?? -16;
if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(lufs) || lufs < -40 || lufs > -5) throw new Error('Invalid duration or lufs');
const sources = [...(cues.music ? [{ ...cues.music, at: 0 }] : []), ...(cues.sfx ?? [])];
if (!sources.length) throw new Error('Provide music or at least one sound effect; use a silent render otherwise');
const inputs = [], graph = [];
for (const [i, s] of sources.entries()) {
  const start = s.start ?? 0, at = s.at ?? 0, gain = s.gain ?? 0;
  if (typeof s.file !== 'string' || ![start, at, gain].every(Number.isFinite) || start < 0 || at < 0 || at >= duration || gain < -90 || gain > 24)
    throw new Error(`Invalid source ${i}`);
  inputs.push('-i', resolve(dirname(file), s.file));
  const length = s.duration ?? duration - at;
  if (!Number.isFinite(length) || length <= 0) throw new Error(`Invalid source duration ${i}`);
  graph.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start=${start}:duration=${length},asetpts=PTS-STARTPTS,volume=${gain}dB,adelay=${Math.round(at * 1000)}:all=1[s${i}]`);
}
const combined = sources.length === 1 ? '[s0]anull' : `${sources.map((_, i) => `[s${i}]`).join('')}amix=inputs=${sources.length}:normalize=0:duration=longest`;
graph.push(`${combined},asetpts=N/SR/TB,apad=whole_dur=${duration},atrim=duration=${duration}[out]`);
const output = await outputPath(o.output), temp = await mkdtemp(join(tmpdir(), 'motion-mix-'));
const ff = argv => run('ffmpeg', ['-hide_banner', '-y', ...argv], { timeout: 120000 }).stderr;
try {
  const raw = join(temp, 'raw.wav');
  ff(['-v', 'error', ...inputs, '-filter_complex', graph.join(';'), '-map', '[out]', '-t', String(duration), raw]);
  const report = ff(['-i', raw, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(report.match(/\{[^{}]*"input_i"[^{}]*\}/)?.[0] ?? '{}');
  if (!Number.isFinite(Number(m.input_i))) throw new Error('Audio is silent or loudness analysis failed');
  ff(['-v', 'error', '-i', raw, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`, '-ac', '2', output]);
  console.log(`PASS ${output}`);
} finally { await rm(temp, { recursive: true, force: true }); }
