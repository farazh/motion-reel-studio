import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, run } from '../scripts/common.mjs';

function invoke(script, args, success = true) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', script), ...args], {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 90000,
  });
  assert.ifError(result.error);
  if (success) assert.equal(result.status, 0, result.stderr + result.stdout);
  else assert.notEqual(result.status, 0, 'Expected failure: ' + result.stdout);
  return result;
}

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'motion-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const config = join(dir, 'film.json');
  const film = { width: 180, height: 320, duration: 3, fps: 12, scene: join(root, 'films/demo/index.html'), audio: null };
  await writeFile(config, JSON.stringify(film));
  return { dir, config, film };
}

function tone(dir) {
  const file = join(dir, 'tone.wav');
  run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3:sample_rate=48000', file]);
  return file;
}

test('silent export passes QC; mismatched frame rate fails', async t => {
  const { dir, config } = await fixture(t);
  const video = join(dir, 'silent.mp4');
  invoke('render.mjs', ['--project', config, '--output', video]);
  invoke('qc.mjs', ['--project', config, '--video', video]);
  const wrong = invoke('qc.mjs', ['--project', config, '--video', video, '--fps', '24'], false);
  assert.match(wrong.stdout, /FAIL 24 fps/);
});

test('contact sheet and poster contain rendered images', async t => {
  const { dir, config } = await fixture(t);
  invoke('board.mjs', ['--project', config, '--output', join(dir, 'board.png'), '--times', '0,1,2.9']);
  for (const name of ['board.png', 'poster.png']) {
    const image = await readFile(join(dir, name));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.ok(image.length > 1000);
  }
});

test('mixer supports music, effects, and combined sources', async t => {
  const { dir } = await fixture(t);
  tone(dir);
  const cases = {
    music: { music: { file: 'tone.wav', gain: -3 }, sfx: [] },
    effects: { sfx: [{ file: 'tone.wav', at: .05, start: .1, gain: -6 }] },
    combined: { music: { file: 'tone.wav', gain: -6 }, sfx: [{ file: 'tone.wav', at: .4, gain: -10, duration: .5 }] },
  };
  for (const [name, sources] of Object.entries(cases)) {
    const cues = join(dir, `${name}.json`), output = join(dir, `${name}.wav`);
    await writeFile(cues, JSON.stringify({ duration: 3, ...sources }));
    invoke('mix.mjs', ['--cues', cues, '--output', output]);
    assert.ok((await readFile(output)).length > 48000);
  }
});

test('audio export passes QC; missing and short audio fail', async t => {
  const { dir, config } = await fixture(t);
  const sound = tone(dir), cues = join(dir, 'cues.json'), mix = join(dir, 'mix.wav');
  await writeFile(cues, JSON.stringify({ duration: 3, music: { file: 'tone.wav', gain: -3 } }));
  invoke('mix.mjs', ['--cues', cues, '--output', mix]);
  const scored = join(dir, 'scored.mp4');
  invoke('render.mjs', ['--project', config, '--output', scored, '--audio', mix]);
  invoke('qc.mjs', ['--project', config, '--video', scored, '--audio', mix]);
  const silent = join(dir, 'silent.mp4');
  run('ffmpeg', ['-v', 'error', '-i', scored, '-an', '-c:v', 'copy', silent]);
  const missing = invoke('qc.mjs', ['--project', config, '--video', silent, '--audio', mix], false);
  assert.match(missing.stdout, /FAIL one required audio stream/);
  const short = join(dir, 'short.wav');
  run('ffmpeg', ['-v', 'error', '-i', sound, '-t', '0.3', short]);
  assert.match(invoke('render.mjs', ['--project', config, '--output', scored, '--audio', short], false).stderr, /full film duration/);
});

test('renderer rejects failed assets and stateful scenes', async t => {
  const { dir, config, film } = await fixture(t);
  const scene = join(dir, 'bad.html'), output = join(dir, 'bad.mp4');
  await writeFile(config, JSON.stringify({ ...film, scene }));
  await writeFile(scene, `<canvas id="c" width="180" height="320"></canvas><script>window.ready=Promise.reject(new Error('missing-image'));window.seek=()=>{};</script>`);
  assert.match(invoke('render.mjs', ['--project', config, '--output', output], false).stderr, /missing-image/);
  await writeFile(scene, `<canvas id="c" width="180" height="320"></canvas><script>window.ready=Promise.resolve();let n=0;window.seek=()=>{const g=document.querySelector('canvas').getContext('2d');g.fillStyle='rgb('+(++n*20)+',0,0)';g.fillRect(0,0,180,320)};</script>`);
  assert.match(invoke('render.mjs', ['--project', config, '--output', output], false).stderr, /Non-deterministic/);
});
