import { readFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function args(allowed, argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !allowed.includes(key) || argv[i + 1] === undefined || argv[i + 1].startsWith('--'))
      throw new Error(`Expected named options: ${allowed.map(k => `--${k} VALUE`).join(' ')}`);
    if (key in out) throw new Error(`Duplicate option: ${key}`);
    out[key] = argv[i + 1];
  }
  return out;
}
export function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0)
    throw new Error(`${command} failed: ${result.error?.message ?? result.stderr?.toString().slice(-4000) ?? result.status}`);
  return { stdout: result.stdout, stderr: result.stderr };
}
export async function project(file = 'films/demo/film.json', overrides = {}) {
  const path = resolve(file);
  const value = JSON.parse(await readFile(path, 'utf8'));
  const p = { ...value, path, dir: dirname(path) };
  for (const key of ['width', 'height', 'fps']) {
    p[key] = Number(overrides[key] ?? p[key]);
    if (!Number.isInteger(p[key]) || p[key] <= 0) throw new Error(`Invalid ${key}`);
  }
  if (p.width % 2 || p.height % 2) throw new Error('Width and height must be even');
  if (!Number.isFinite(p.duration) || p.duration <= 0) throw new Error('Invalid duration');
  if (Math.abs(p.duration * p.fps - Math.round(p.duration * p.fps)) > 1e-6)
    throw new Error('duration × fps must be a whole number of frames');
  if (typeof p.scene !== 'string') throw new Error('Missing scene');
  p.scene = resolve(p.dir, p.scene);
  p.audio = overrides.audio === 'none' ? null : overrides.audio ? resolve(overrides.audio) : p.audio ? resolve(p.dir, p.audio) : null;
  p.lufs = p.lufs ?? -16;
  if (!Number.isFinite(p.lufs) || p.lufs < -40 || p.lufs > -5) throw new Error('Invalid lufs');
  await access(p.scene);
  if (p.audio) await access(p.audio);
  return p;
}
export async function outputPath(path) {
  const full = resolve(path);
  await mkdir(dirname(full), { recursive: true });
  return full;
}
export function probe(file) {
  return JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
}
export async function openScene(p) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: p.width, height: p.height }, deviceScaleFactor: 1 });
    const failures = [];
    page.on('pageerror', e => failures.push(e.message));
    page.on('requestfailed', r => failures.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
    const url = pathToFileURL(p.scene);
    for (const key of ['width', 'height', 'duration']) url.searchParams.set(key, String(p[key]));
    await page.goto(url.href);
    await page.evaluate(async () => {
      if (!window.ready || typeof window.seek !== 'function') throw new Error('Scene must expose ready and seek(t)');
      await Promise.race([window.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Asset loading timeout')), 30000))]);
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode()));
    });
    const canvas = page.locator('#c');
    const size = await canvas.evaluate(c => ({ w: c.width, h: c.height }));
    if (size.w !== p.width || size.h !== p.height) throw new Error('Canvas size does not match export settings');
    const frame = async t => {
      await page.evaluate(time => window.seek(time), t);
      if (failures.length) throw new Error(failures.join('\n'));
      return canvas.screenshot({ animations: 'disabled' });
    };
    return { browser, page, frame };
  } catch (e) { await browser.close(); throw e; }
}
export async function checkDeterminism(frame, p) {
  const times = [0, p.duration * 0.37, p.duration - 1 / p.fps];
  const initial = []; // capture sequentially; all frames share one canvas
  for (const t of times) initial.push(await frame(t));
  for (let i = times.length - 1; i >= 0; i--)
    if (!initial[i].equals(await frame(times[i]))) throw new Error(`Non-deterministic frame at ${times[i]}s`);
}
