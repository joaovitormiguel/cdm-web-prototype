# cdm-web-prototype

Landing-page prototype for **Champion Digital Media** — a scroll-scrubbed hero where the
camera pulls out of a private jet (interior → impossible exit → exterior), with the headline
revealing over the clean left side as the aircraft settles to the right.

## Run it

The hero is a video scrubbed by scroll position. Browsers seek a local `file://` video
unreliably, so serve it over HTTP:

```bash
python3 server.py        # serves this folder on http://127.0.0.1:4137
```

Then open <http://127.0.0.1:4137>.

## Structure

```
index.html        single-file page (inline CSS + JS)
assets/hero.mp4    9s hero clip, re-encoded all-keyframe for frame-accurate scrubbing
assets/poster.jpg  first-frame poster
server.py          tiny static server for smooth local preview
```

## How the hero works

- A tall scroll "stage" pins the video (`position: sticky`); scroll progress maps to the
  video's `currentTime`, eased in a `requestAnimationFrame` loop for a smooth scrub.
- From ~60–92% progress the headline + a left scrim fade/slide in over the clean sky.
- Respects `prefers-reduced-motion` (static hero fallback).

### Tunables (top of `index.html`)
- `--stage` — scroll distance that drives the clip (bigger = slower pull-out).
- `map(p, 0.60, 0.92)` in the script — when the headline reveals.

## Type

- **Azeret Mono** (system) loads from Google Fonts.
- **Podium Sharp Italic** (display) is licensed — add an `@font-face` and the `--display`
  variable picks it up automatically. Until then it falls back to a condensed italic.

Brand palette: ink `#141414` · cream `#F7F3E9` · amber `#F9AC24` · blue `#062D51`.
