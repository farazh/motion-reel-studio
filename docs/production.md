# Production

## Film configuration

`films/<slug>/film.json` sets `title`, `width`, `height`, `fps`, `duration` in
seconds, `scene`, `audio` (path or null), and `lufs` (default −16).
Width and height must be even integers; duration × fps must be a whole number.
JSON paths resolve relative to the configuration file. CLI paths resolve from
the current directory.

## Scene contract

The scene uses `canvas#c` and reads the `width`, `height` and `duration` query
parameters. It exposes:

```js
window.ready = Promise.all([
  // FontFace.load(), image.decode(), other asset preparation
]);
window.seek = (seconds) => {
  // Reset drawing state and draw the complete frame at this timestamp.
};
```

Compute animation from time. The renderer samples three timestamps out of order
to check repeatability. Load fonts and images through `window.ready` so missing
assets fail the render. Recompose the layout for each aspect ratio.

## Render and review

From the repository root:

```sh
npm run new -- --name product-launch
npm run board -- --project films/product-launch/film.json --output out/product-launch/board.png --times 0,3,7,12,17,19.9
npm run render -- --project films/product-launch/film.json --width 360 --height 640 --fps 30 --audio none --output out/product-launch/animatic.mp4
npm run qc -- --project films/product-launch/film.json --width 360 --height 640 --fps 30 --audio none --video out/product-launch/animatic.mp4
npm run render -- --project films/product-launch/film.json --output out/product-launch/final.mp4
npm run qc -- --project films/product-launch/film.json --video out/product-launch/final.mp4
```

Use matching overrides for rendering and QC. `new` refuses existing film names;
rendering and board commands overwrite their output files. The board command
also saves its second timestamp as `poster.png` beside the sheet.

Rendering captures temporary PNG frames and encodes H.264/yuv420p at CRF 16.
Start with a small animatic to check pacing before rendering at full resolution.
Open `index.html?t=2` to preview a still. For a transition strip:

```sh
ffmpeg -ss 3.8 -i out/product-launch/final.mp4 -vf 'scale=180:-1,tile=8x1' -frames:v 1 out/product-launch/transition.png
```

Review readability, composition, transitions and sound. Record timestamped
issues and fixes in `brief.md`. QC checks specs, not whether the film is any good.
It exits nonzero for incorrect dimensions, frame rate/count, duration, audio
format, loudness, peak or decode errors.

## Audio

Record sources, licenses and credits in the film brief.
Put cue settings in `films/product-launch/cues.json`:

```json
{
  "duration": 20,
  "lufs": -16,
  "music": { "file": "audio/track.wav", "start": 12, "gain": -4 },
  "sfx": [
    { "file": "audio/click.wav", "at": 3.5, "start": 0, "gain": -8, "duration": 0.4 }
  ]
}
```

Paths resolve relative to the cue file. `start` trims into a source; `at` places
it on the timeline; `gain` is dB; per-source `duration` limits its length.
Music starts at timeline zero. Music-only and effects-only mixes are supported.
The mixer pads to the film length and normalizes in two passes, targeting
−1.5 dBTP. Choose excerpts and shape fades in the source audio.

```sh
npm run mix -- --cues films/product-launch/cues.json --output out/product-launch/mix.wav
npm run render -- --project films/product-launch/film.json --audio out/product-launch/mix.wav --output out/product-launch/final.mp4
npm run qc -- --project films/product-launch/film.json --audio out/product-launch/mix.wav --video out/product-launch/final.mp4
```

You can also set `audio` in `film.json`. Use `--audio none` for a silent cut.
Audio must cover the film's duration. QC measures the encoded AAC loudness and
peak; check cue timing and balance by listening.

Deliver the MP4, poster, contact sheet, editable source, credits and render command.
