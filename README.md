# CPS305 Quest

A browser game that teaches CPS 305 (Data Structures, TMU) by letting you *play* each algorithm.
Unofficial study aid based on CPS 305 lecture materials.

## Play

Open `index.html` in any modern browser. No server, no build step, no network: it works offline from disk.

(For development previews, `python -m http.server 8305` in this folder also works.)

## Test

```
node tests/run-tests.js      # engine, referee, counters vs theory, stability, state layer
node tests/verify-lisp.js    # runs every Lisp result shown in the game through SBCL
```

`verify-lisp.js` needs `sbcl` on your PATH.

## Layout

| Folder | What lives there |
| --- | --- |
| `engine/` | Pure step generators (no DOM). Each algorithm yields state snapshots + operation counters. `referee.js` turns a trace into the decisions a player must make and judges moves. |
| `ui/` | Reusable components: array view (SVG), Lisp code panel, stepper, counters, feedback, quiz, decision runner (Try/Solo), watcher (Watch/compare). `ui/games/` has one controller per mini-game. |
| `content/` | Data only: units, levels, questions, explanations, Lisp snippets, concept cards. Edit words here without touching logic. |
| `state/` | Progress, XP, streak, mastery, Leitner boxes, adaptive tiers, settings, all in `localStorage` (try/catch: still works if storage is blocked). |
| `lisp/` | The canonical Lisp each unit shows. The code panels are checked against it. |
| `tests/` | Plain Node test scripts. |

## Adding a unit

1. `content/unitN.js` registers `CQ.content.unitData[N]` (same shape as `unit5.js`).
2. Set `built: true` for it in `content/units.js`.
3. Add any new step generators to `engine/`, mini-game controllers to `ui/games/`, and the `<script>` tags to `index.html`.
4. Put its Lisp in `lisp/unitN.lisp` and add the file to `tests/verify-lisp.js`.
