# Motion Reel Studio

A generic video workspace: HTML/canvas → Playwright Chromium → FFmpeg MP4.

- For video work, read `skills/motion-reel/SKILL.md` and the film brief.
- For toolkit changes, keep examples and commands working on a fresh checkout.
  Run `npm test`; it exercises real browser rendering, audio mixing and QC.
- Source of truth for skills: `skills/motion-reel/`. `npm run setup` copies it
  into ignored project-local discovery directories for Claude and Codex.
- Scene assets belong beside the scene or in a directory the scene references.
  User assets need their own usage rights. Never embed credentials or private
  machine paths. Outputs belong in ignored `out/`.
- Keep runtime dependencies minimal. The baseline requires Node, Chromium and
  FFmpeg/ffprobe; Python, paid APIs and framework plugins are optional.
- Do not promise a model, platform or package version that was not tested.
- No agent co-authorship/metadata. Commit and publish only on explicit request.
