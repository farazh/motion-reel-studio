import { args, project, probe, run } from './common.mjs';
const o = args(['project', 'video', 'width', 'height', 'fps', 'audio']);
if (!o.video) throw new Error('--video is required');
const p = await project(o.project, o), info = probe(o.video), failures = [];
const check = (ok, message) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`); if (!ok) failures.push(message); };
const videos = info.streams.filter(s => s.codec_type === 'video');
const audios = info.streams.filter(s => s.codec_type === 'audio');
check(videos.length === 1, 'one video stream');
const v = videos[0] ?? {};
const rate = value => { const [n, d] = String(value).split('/').map(Number); return n / d; };
check(v.codec_name === 'h264' && v.pix_fmt === 'yuv420p', 'H.264 / yuv420p');
check(v.width === p.width && v.height === p.height, `${p.width}×${p.height}`);
check(Math.abs(rate(v.avg_frame_rate) - p.fps) < 1e-6 && Math.abs(rate(v.r_frame_rate) - p.fps) < 1e-6, `${p.fps} fps`);
check(Number(v.nb_read_frames) === Math.round(p.duration * p.fps), 'exact decoded frame count');
check(Math.abs(Number(v.duration) - p.duration) <= 1 / p.fps, 'video duration');
check(Math.abs(Number(info.format.duration) - p.duration) <= Math.max(1 / p.fps, .05), 'container duration');
check(audios.length === (p.audio ? 1 : 0), p.audio ? 'one required audio stream' : 'silent export');
if (p.audio && audios.length) {
  const a = audios[0];
  check(a.codec_name === 'aac' && Number(a.sample_rate) === 48000 && a.channels === 2, 'AAC / 48 kHz / stereo');
  check(Math.abs(Number(a.duration) - p.duration) <= .05, 'full-length audio');
  const { stderr } = run('ffmpeg', ['-hide_banner', '-i', o.video, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const loudness = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1] ?? NaN);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1] ?? NaN);
  check(Math.abs(loudness - p.lufs) <= 1, `${p.lufs} ±1 LUFS (got ${loudness})`);
  check(Number.isFinite(peak) && peak <= -1, `true peak ≤ −1 dBTP (got ${peak})`);
}
try { run('ffmpeg', ['-v', 'error', '-xerror', '-i', o.video, '-f', 'null', '-']); check(true, 'full decode'); }
catch { check(false, 'full decode'); }
console.log(`${failures.length ? 'FAIL' : 'PASS'} ${o.video}`);
process.exitCode = failures.length ? 1 : 0;
