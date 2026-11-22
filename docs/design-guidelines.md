# Design guidelines

The site's look is **Fraunhofer**: a spectrum read through a spectroscope. A calm page,
a light serif for titles, a plain sans for reading, and colour only in thin spectral
bands and a few colours with fixed meanings. These guidelines hold for the site and for
the apps that share its look (Zaptos, the Time Blocks planner). The values live in
`src/styles/tokens.css` and `dark-mode.css`; this file says how to use them.

Two goals, in this order: **easy to read**, then **distinctive**. When they conflict,
readability wins.

## 1. Readability

- **Contrast.** Any text someone has to read is at least **4.5:1** against its background
  (WCAG AA). Measure it; don't judge by eye on one monitor.
- **Grey has a floor.** `--text-subtle` (#6c6f7e, 3.8:1 on the dark page) is never used
  for sentences: only for decoration, disabled controls, placeholders and separators.
  Secondary text that people read (captions, paths, hints, "last worked 5 Nov") is
  `--text-muted`, or in apps the meta grey #8a8d9c (6:1).
- **Size has a floor.** Prose is 1rem (16px) on the site. In apps, reading text is 15px
  and nothing people read is under 13.5px. 12.5px is only for timestamps, key hints and
  mono numbers in columns.
- **Hierarchy by a few clear steps**, not many near-identical ones (see the type scale).
  Two sizes that differ by 0.5px are one size.
- **Nearly opaque surfaces.** Text never sits over an image. A window may be slightly
  translucent (Omarchy's 0.96 to 0.985) but no more: the wallpaper must not show through text.
- **Line length** at most ~75 characters for running text.

## 2. Colour

Dark-mode values (light mode in `tokens.css`):

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--bg` | #0e1014 | | Page |
| `--surface` | #13151c | | Things you act on: inputs, tasks, dialogs, code |
| `--border` | #242733 | | Structure: under table heads, around controls |
| `--border-subtle` | rgba(233,234,240,.07) | | Hairlines between rows |
| `--text` | #e9eaf0 | 15.9 | Titles, values, the thing a row is about |
| `--text-body` | #d3d6e0 | 13.1 | Running text |
| `--text-muted` | #a3a6b4 | 7.9 | Secondary text, inactive nav and tabs |
| meta (apps) | #8a8d9c | 5.8 | Paths, dates, captions, hints |
| `--text-subtle` | #6c6f7e | 3.8 | Decoration only (see above) |

**Colour means something.** Each colour has one job, the same everywhere:

| Colour | Meaning |
|---|---|
| Accent blue `--accent` #9fb2ff | Links and interaction only: focus, selection, drop targets |
| Sodium `--sodium` #ffc54a | Needs attention: stale, behind, a problem |
| Green #4fdc8c | Done, a result |
| Red #ff6b78 | Errors, destructive actions, meetings |
| Beam #fff3d6 | "Now": the running session, the now-line, the one primary button |
| The spectrum (`--stops`) | Identity and progress: the site's band, a project's stages |

In blog figures: blue = mine, grey = baseline, amber = third series, red = worse.

- No colour as decoration. If a colour doesn't mean one of the above, it is grey.
- Colours must stand out on the dark page: muted reds, magentas and greens read as grey.
  Check them at their actual size.

## 3. Type

| Family | Use |
|---|---|
| Spectral | Titles and names (page titles, project names, section headings). 300 at 28px and up, 400 below: light weights get thin at small sizes. |
| IBM Plex Sans | Everything people read and everything they click |
| IBM Plex Mono | Code, file paths, times and numbers that line up in columns |

**App scale** (px; the site uses its rem scale in `fraunhofer.css`):

| Step | Size | Use |
|---|---|---|
| Page title | 36 | One per page, Spectral 300 |
| Section | 24 | Section headings, project names in lists |
| Item title | 20 | Card or row titles, dialog titles |
| Large text | 16 | Emphasised running text |
| Body | 15 | Default: running text, list items, buttons, inputs |
| Label | 13.5 | Captions, section labels, table heads, meta |
| Small | 12.5 | Timestamps, key hints, mono columns only |

- **Labels are sentence case**, sans, weight 500 to 600. Never tracked capitals or mono
  capitals (the site dropped them deliberately).
- Line height 1.5 in UI, 1.7 to 1.75 in prose.
- Mono inside a sentence only for something literal (`facts.toml`), never for emphasis.

## 4. Layout and surfaces

- **One surface, few boxes.** Group with spacing and hairlines, not cards. Use a
  surface only for something you act on (a task, an input, a dialog).
- **Rules:** 1px. `--border` under headers and around controls; `--border-subtle`
  between rows. No heavy lines or double rules.
- **Spacing** on a 4px grid: 4, 8, 12, 16, 24, 32, 48. Related things sit closer than
  unrelated ones; a heading sits closer to its content than to what is above it.
- No excess whitespace, oversized titles or oversized images.
- **Sections in apps: headings in the margin.** A page with several sections sets each
  heading (italic Spectral, its item count under it) in a ~190px left column, with the
  content beside it and a hairline between sections, as the site's Work page sets its years. The eye
  runs down the left edge to find a section. Few sections per page (about 3), ordered by
  urgency; an empty section is one line, never a heading over "None." Zaptos:
  `section()` in `app.js`, `.sec` in `style.css`.
- **Radius:** 3px on the site; 6px for controls and 8px for dialogs in apps.
- Don't repeat the same item on one page (a project listed twice, two buttons doing the
  same thing).

## 5. The spectral element

The one distinctive idea is the **band**: a thin strip of spectrum, sometimes with
absorption or emission lines. Use it where it carries information:

- Site: the page's spectrum under the header, the active nav mark, link underlines on
  hover, the reading strip.
- Apps: a project's stages, the active nav item, the now-line.

At most one band per region of a page, and never as a divider or an ornament on every
heading. Everything else stays grey.

## 6. Controls

- **Primary button:** beam fill, dark text, at most one per view.
- **Secondary button:** `--surface` fill, `--border` outline, accent outline on hover.
- **Text actions** (edit, remove, more): muted text, `--text` on hover; destructive
  ones in red.
- **One-of choices** (kind, range, category): pills, not buttons.
- **Inputs:** `--surface`, `--border`, accent border on focus.
- **Focus:** a 2px accent ring, keyboard focus only.

## 7. Motion

- Hovers and state changes 0.15 to 0.2s; the band's own transitions may be slower.
- Respect `prefers-reduced-motion`.
- Hover cards and tooltips go away as soon as the pointer leaves.

## Checklist for a change

1. Every text colour on its background is ≥ 4.5:1; nothing people read uses `--text-subtle`.
2. Every size is a step of the scale.
3. Every colour has one of the meanings above.
4. Nothing new is boxed that could be grouped by spacing.
5. Checked on the real screen, in both themes (site) and at the window sizes it is used at (apps).
