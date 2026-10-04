# Motion Reel Studio

Make motion-graphics videos with Claude or Codex. Bring a brief, references and
assets; the agent builds and reviews the animation, then exports an MP4.

![Demo](docs/preview.png)

## Quick start

Install Node.js 22+, FFmpeg and ffprobe. On macOS:

```sh
brew install node ffmpeg
```

From the repository root:

```sh
npm ci
npm run setup
npm run board
npm run render -- --width 360 --height 640 --fps 30 --output out/demo-preview.mp4
npm run qc -- --width 360 --height 640 --fps 30 --video out/demo-preview.mp4
```

This renders a six-second silent demo. Run `npm run render` for 1080×1920 at
60 fps. Full-resolution renders can take several minutes.

Setup installs Chromium and the project-local skill for Claude and Codex.
Rerun it after changing `skills/motion-reel/`. On Linux, Chromium may also need
`npx playwright install-deps chromium`.

## Make a film

Open the repository in your coding agent and ask:

> Use the motion-reel skill to make a 20-second introduction for [product].
> Assets and references: [folder]. Audience: [audience]. Message: [message].
> Audio: [preference]. Deliver the video, poster, contact sheet and source.

Or scaffold a film yourself:

```sh
npm run new -- --name my-product
```

Edit `films/my-product/brief.md`, `film.json` and `index.html`.

## Included

- Canvas renderer with asset checks and repeatability checks.
- Contact sheets and posters.
- Music and effects mixer with loudness normalization.
- Export QC for dimensions, timing, audio and decoding.
- A [production skill](skills/motion-reel/SKILL.md) that uses this repository's scripts.

See [production.md](docs/production.md) for configuration and commands.
Run `npm test` for the integration tests. Tested locally on macOS; the Linux
GitHub Actions workflow awaits its first run.

Workflow inspired by [this thread by Movez](https://x.com/0xMovez/status/2104216919033192746).

[MIT license](LICENSE).
