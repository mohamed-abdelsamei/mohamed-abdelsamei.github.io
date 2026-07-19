# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mohamed Abdelsamei's personal site (mabdelsamei.com): a single-page static portfolio (root `index.html`/`style.css`, no build step) plus an Astro-powered blog under `/blog`. Custom domain is set in `CNAME`; `.nojekyll` disables Jekyll processing. Deployed via GitHub Actions (`.github/workflows/deploy.yml`) — builds the Astro project and assembles it with the untouched static root files into one Pages artifact. The repo's GitHub Pages source must be set to "GitHub Actions" (Settings → Pages), not "Deploy from a branch".

The root site itself has no build system, package manager, linter, or test suite — it's plain HTML/CSS with two small inline scripts (theme pre-paint + toggle). Edit `index.html`/`style.css` directly and preview in a browser (e.g. `open index.html` or `python3 -m http.server`). The blog (`blog/`) is a separate, self-contained npm/Astro project — see below.

## Structure

- `index.html` — the entire site: meta/SEO tags (Open Graph, Twitter, JSON-LD Person schema), a sticky nav with theme toggle, and sections . Two small inline scripts: one in `<head>` applies the saved theme from `localStorage('ma-theme')` before first paint, one at the end wires the toggle button.
- `style.css` — all styling. Design tokens (colors, fonts) live in `:root` custom properties at the top; always use these variables rather than hardcoding values. Sections are organized under `/* ─── Name ─── */` comment banners in the same order as the HTML.
- Design source of truth: the user's claude.ai/design project "Personal portfolio design" (id `96d6525f-757d-454b-be9e-e65bbb3dbda4`) — layout from `Mohamed Abdelsamei.dc.html`, brand rules from `Brand Guide v2.dc.html` (fetch via the DesignSync tool). Key brand rules: single typeface JetBrains Mono (400/500/700, italic for asides); dark theme is default (ink `#0b0d0c`, phosphor accent `#4ade8f`), light theme is paper `#fafaf7` with forest accent `#0b7a48` via `:root[data-theme='light']`; the logo is lowercase `ma` + an accent block underscore off the baseline (`.logo` / `.logo-block`, never a `_` character, never uppercase); the favicon is the accent block alone on ink; accent is punctuation (≤6% of any view, never body copy, never a surface); text on accent fills is always ink; voice: `##` sections, `//` annotations, `$` prompts, CTAs as commands, lowercase labels. Brand PNG assets (logos, avatars, social banners) live in the design project's `assets/` folder.
  - The `open_source` section (`#open-source` in `index.html`, the `aws_xray_sdk` package card) is **not** in `Mohamed Abdelsamei.dc.html` — it's real content the design mockup doesn't track. Preserve it (and its nav link) when re-syncing layout from the design file; don't drop it just because the source design omits it.
  - Reusable card/component patterns established in `style.css`, reuse rather than inventing new ones for similar content: `.card` (bordered `var(--card)`-background box — used by `work-grid`, `card--solo`, `stack-card`), `.term` (terminal-window chrome — dot-bar header + body — used by the writing section for any future "console output" style content), `.chip` / `.chip--lg` (small bordered tag; `--lg` is the roomier variant used in `also_speaks`), and `.stack-freq` (inline right-aligned frequency/status label on a list row, with `.accent` for a highlighted status like "certified SA").
- `404.html` — standalone error page with its own inline styles (does not use `style.css`).
- SEO plumbing: `sitemap.xml` (update `lastmod` on content changes, homepage only), `robots.txt` (lists both `sitemap.xml` and the blog's generated `blog/sitemap-index.xml`), `feed.xml` (legacy empty RSS shell — nothing links to it anymore; the real feed is `/blog/rss.xml`, left in place rather than deleted since it may already be indexed), `google02b7a32b9c11fcc0.html` (Search Console verification — do not delete).
  - `og-image.jpg` is 460×460 (fine for Twitter's `summary` card). It's undersized for LinkedIn/Slack/Facebook link previews, which want ~1200×630 — known gap, not yet fixed because there's no image-generation tool in this environment and the design project's existing banner assets (`linkedin_banner.png` 1584×396, X banner similar) are the wrong aspect ratio to crop from. If a proper 1200×630 asset shows up, wire it into `og:image`/`og:image:width`/`og:image:height` and flip `twitter:card` from `summary` to `summary_large_image`.

## Blog (`blog/`)

Self-contained Astro project (own `package.json`/`node_modules`), scoped entirely to `/blog` via `base: '/blog'` in `astro.config.mjs`. Posts are Markdown/MDX content collection entries under `src/content/blog/*.md`, schema in `src/content.config.ts`.

- **Design is not duplicated.** `BlogLayout.astro` links the real root `/style.css` directly (same-origin absolute path) plus the same Google Fonts JetBrains Mono link — any hand-edit to root design tokens propagates to the blog for free. `src/styles/blog.css` only adds what doesn't exist in the root stylesheet: prose typography, code-block coloring (via Astro's `--astro-code-*` Shiki CSS variables, **not** `--shiki-*`), and blog-specific tokens (`--code-bg`, `--tok-k/s/c/f`, with `[data-theme='light']` overrides).
- **`astro dev` in isolation will look unstyled** — the dev server root is `blog/`, so `/style.css` 404s locally. This is expected. Verify styling by building (`npm run build`) and serving repo root + `blog/dist` together (see Verification below), not via `npm run dev` alone.
- **Nav must stay in sync with the root site's nav** (`BlogLayout.astro`'s `<nav>` vs `index.html`'s `<nav>`): same items in the same order (`work`, `open_source`, `writing`, `stack`, `contact`), same target sections — only `writing` differs, pointing to `/blog/` instead of `#writing`, and carries the `accent` class as the blog subsection's "you are here" cue. Keep these two navs in lockstep when editing either one — they drifted apart once already (a `blog`-labeled, `stack`-less version) and had to be reconciled.
- Code blocks get wrapped in a terminal-style "code-card" (filename bar + copy button) **client-side**, in `BlogLayout.astro`'s inline script — not via a rehype/AST transform. Astro's Shiki output isn't reachable as a plain hast element tree at the point `markdown.rehypePlugins` run, so a build-time wrap silently does nothing; this was confirmed by testing, not assumed.
- `rss.xml.js` and `@astrojs/sitemap` (configured with no extra options) are the blog's own feed/sitemap — independent of the root's hand-maintained `sitemap.xml`/`feed.xml`.
- `BlogLayout.astro` emits its own OG/Twitter meta and canonical, plus JSON-LD `BlogPosting` on post pages (`type="article"`, via `publishedTime`/`tags` props) — reuses root `/og-image.jpg`. Keep title/description wording in sync across `<title>`, meta description, OG/Twitter, and JSON-LD here too, same convention as the root page.
- CI (`.github/workflows/deploy.yml`) explicitly allowlists which root static files get copied into the deploy artifact — add new root static files to that `cp` list, they won't ship automatically. Node version in the workflow (`actions/setup-node`) must satisfy `blog/package.json`'s `engines.node` (currently `>=22.12.0`) — this drifted once already (workflow pinned to Node 20) and silently would have broken CI.

**Verification**: `cd blog && npm run build`, then from repo root assemble and serve the real deploy topology before trusting any styling/link change:
```
mkdir -p _site && cp index.html 404.html CNAME .nojekyll robots.txt sitemap.xml feed.xml og-image.jpg google02b7a32b9c11fcc0.html style.css _site/
mkdir -p _site/blog && cp -r blog/dist/. _site/blog/
python3 -m http.server 8080 --directory _site
```
Check both `/` and `/blog/*` — this is the only way to catch base-path or same-origin-stylesheet mistakes, since `npm run dev` alone can't.

## Conventions

- Design iterations happen on branches (`v2`, `v3`, `v3.1`, `design/*`); `master` is what's live.
- Contact/CTA copy must never solicit freelance, contract, or paid side work. "Open to connect" means networking, open standards, open source, and conversation — keep it that way.
- No city/location in visible prose (hero, footer, meta/OG/Twitter descriptions, JSON-LD `description`) — deliberately removed. The only place location still lives is the JSON-LD `address` structured field (`addressLocality: "Berlin"`), which is metadata for search engines, not copy a visitor reads. Don't re-add "Berlin" to the footer or descriptions as a "fix"; that's reverting an intentional decision.
- Content and metadata are duplicated across `<title>`, meta description, OG/Twitter tags, and JSON-LD (root page and, separately, `BlogLayout.astro` for blog pages) — keep them in sync when changing wording (role title, description, links).
- Accessibility patterns are deliberate: skip link, `aria-label`s on sections, `aria-hidden` on decorative elements, `prefers-reduced-motion` support in CSS. Preserve them when editing.
  - The literal `##`/`###` prefixes used for the terminal-voice section headers (`.sec-hdr` on the root page, `.prose-hdr-mark` in blog post bodies) must be a separate `aria-hidden="true"` span, never baked into the heading's own text — otherwise assistive tech and text-extraction tools read/duplicate the decorative marks as real heading content.
  - Adjacent inline `<span>`s inside one text-bearing element (e.g. `.stack-list li`'s skill name + `.stack-freq` tag) need a real space/text node between them, even when a flex `justify-content: space-between` already separates them visually — otherwise extracted/screen-reader text concatenates them with no word boundary (`Node.js / TypeScriptcore`).
- Commit messages follow a loose conventional style (`feat:`, `chore:`, `content:`).
