---
name: motion-reel
description: Create or revise motion graphics, product films and promotional reels in a Motion Reel Studio checkout, from brief and assets through rendered video.
---

# Motion reel

Work from the Motion Reel Studio root. Read `AGENTS.md`, `docs/production.md`
and the selected film's `brief.md`. This skill uses the studio's scripts.

## Brief and assets

Establish the audience, message, references, duration, formats and audio direction.
Ask for missing inputs that affect the result; continue asset inspection while
waiting. Keep asset sources, rights and evidence for product claims in the brief.
Use real product screens. Treat source repositories as read-only unless asked
to change them.

For a new film, run `npm run new -- --name <slug>`. Write the brief and configure
`films/<slug>/film.json`. Develop the visual direction from the supplied brand
and references.

## Build and review

Write a timestamped shot list. Give the opening a clear hook, make product details
legible, and end with the intended action. Use transitions that connect the shots.
Check typography at phone size and recompose for each aspect ratio.

Implement `window.ready` and `window.seek(t)`. Load fonts and images explicitly.
Each frame must depend only on its timestamp: no carried state, timers, unseeded
randomness or CSS transitions in render mode.

Render a contact sheet and a low-resolution animatic before the full export.
Inspect transitions as well as stills. Record problems with timestamps, fix the
largest ones, and review again. Report anything you could not inspect.

## Audio and delivery

Follow the agreed audio direction; ask if it is missing. Use the cue mixer for
music and effects. Listen for timing, phrasing and balance.

Run QC with the same configuration and overrides used for rendering. Fix every
FAIL. Deliver the MP4, poster, contact sheet, editable source, credits and exact
render command. Keep the review notes. Commit or publish only when requested.
