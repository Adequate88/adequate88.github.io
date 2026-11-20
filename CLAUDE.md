# Alessandro Salo's portfolio

Astro static site, deployed to GitHub Pages by `.github/workflows/deploy.yml` on
push to `master`. `npm run build` must pass before pushing.

- Content: `src/content/blog/*.md` (posts) and `src/content/projects/*.md`
  (project write-ups), schemas in `src/content/config.ts`.
- Styles: `src/styles/` (`tokens.css` + `dark-mode.css` for colours and fonts,
  `fraunhofer.css` for the site's look, `prose.css` for post text,
  `figures.css` for the `fx-` figures, `contents.css` for the contents rail).
- Every page must work in light and dark mode and at phone width.

## Blog posts

**Any work on a blog post uses the `blog-post` skill
(`.claude/skills/blog-post/`).** The standard is
`src/content/blog/tinybvh-amd-hardware-ray-tracing.md`: its structure, voice,
rigour and *kind* of figures. In short:

- Summary: the frontmatter `excerpt`/`description` is the lead paragraph under
  the title (3–4 sentences: problem, what I did, headline result). No TL;DR in
  the body.
- Arc: Tech line → "At a glance" stats → *Why should we care?* (goals as bold
  numbered questions) → how it works → Results → Next steps → Takeaways →
  Further reading shelf → credits.
- Figures are custom HTML/CSS/SVG `fx-` figures with kicker, claim-style title
  and a caption, numbered and referenced in the prose. Colours follow fixed
  meanings: blue = mine, grey = baseline, amber = third series, red = worse.
- **Don't copy the reference post's figures or use a figure type just because
  it exists there.** Design figures from the new post's own subject and real
  data, and build a new `fx-` component when nothing fits.
- Never invent or "illustrate" numbers: every value in a figure is measured and
  matches the text.
- Site typography and heading styles are global; posts never carry their own
  styles.
