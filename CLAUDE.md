# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mohamed Abdelsamei's personal site (mabdelsamei.com): a single unified Astro project covering both the homepage and the blog under `/blog`. Custom domain is set in `public/CNAME`; `public/.nojekyll` disables Jekyll processing. Deployed via GitHub Actions (`.github/workflows/deploy.yml`) — `npm ci && npm run build`, then the `dist/` output is uploaded directly as the Pages artifact (no manual file assembly). The repo's GitHub Pages source must be set to "GitHub Actions" (Settings → Pages), not "Deploy from a branch".

Root `package.json`/`astro.config.mjs`/`tsconfig.json` are the only build config in the repo — one dependency tree, one dev server, one build. `npm run dev` (background mode: `astro dev --background`, then `astro dev stop`/`status`/`logs` to manage it) serves the *entire* site fully styled, including `/blog/*` — there is no longer a split where part of the site 404s locally.

## Structure

```
astro.config.mjs        site: 'https://mabdelsamei.com', @astrojs/mdx + @astrojs/sitemap
src/
  layouts/
    Layout.astro         shared shell: full <head> (meta/OG/Twitter/JSON-LD via props,
                          fonts, favicons, theme-preload script), nav, <slot />, footer,
                          theme-toggle script. Single source of truth for nav — every
                          page (home, blog, 404) renders the same markup, so the old
                          "keep two navs in sync by hand" problem no longer exists.
    BlogLayout.astro      wraps Layout.astro; adds prose.css import + JSON-LD BlogPosting
                          + the code-card-wrap and post-share client scripts (passed into
                          Layout's `scripts` slot).
  pages/
    index.astro           homepage — hero, what_i_do, open_source, writing, stack, contact
    404.astro              error page (noindex, own inline <style> for .err-* classes)
    blog/
      index.astro            post listing
      [...slug].astro         post page (getStaticPaths over the content collection)
      rss.xml.js              @astrojs/rss feed
  content/
    blog/*.md              Markdown/MDX post entries
  content.config.ts        content collection schema (title, description, pubDate,
                            tags, optional ogImage/heroImage/heroAlt)
  styles/
    global.css              all site design tokens + styling (was root style.css) —
                             imported once by Layout.astro, not linked as a public asset
    blog.css                 prose typography, Shiki code-block coloring (via Astro's
                              `--astro-code-*` vars, not `--shiki-*`), blog-only tokens
  lib/
    rehype-post-enhance.mjs  markdown rehype plugin, wired in astro.config.mjs
public/
  CNAME, .nojekyll, robots.txt, sitemap covers are generated (not here) — see SEO below
  favicon.ico/.svg/_32.png/_180.png, og-image.jpg/.png, google02b7a32b9c11fcc0.html,
  feed.xml (legacy empty RSS shell, kept only because it may already be indexed —
  the real feed is /blog/rss.xml), og/*, posters/* (per-post assets)
```

Astro's `public/` directory is copied to the build output verbatim, dotfiles included — this is why CI no longer needs an explicit file allowlist. Adding a new static file just means dropping it in `public/`.

- Design source of truth: the user's claude.ai/design project "Personal portfolio design" (id `96d6525f-757d-454b-be9e-e65bbb3dbda4`) — layout from `Mohamed Abdelsamei.dc.html`, brand rules from `Brand Guide v2.dc.html` (fetch via the DesignSync tool). Key brand rules: single typeface JetBrains Mono (400/500/700, italic for asides); dark theme is default (ink `#0b0d0c`, phosphor accent `#4ade8f`), light theme is paper `#fafaf7` with forest accent `#0b7a48` via `:root[data-theme='light']`; the logo is lowercase `ma` + an accent block underscore off the baseline (`.logo` / `.logo-block`, never a `_` character, never uppercase); the favicon is the accent block alone on ink; accent is punctuation (≤6% of any view, never body copy, never a surface); text on accent fills uses the theme-aware `--on-accent` token (`--ink` `#0b0d0c` in dark, `#fafaf7` in light) — **not** a hardcoded `--ink`, since the accent itself flips from light phosphor (dark theme) to dark forest (light theme), so the same literal ink text that contrasts fine in dark mode fails WCAG AA against the light-mode accent (~3.6:1, needs 4.5:1). This bit `.btn--primary`, `.skip-link`, and `::selection` once already — always use `var(--on-accent)` for text sitting on `var(--accent)`, never `var(--ink)` directly; voice: `##` sections, `//` annotations, `$` prompts, CTAs as commands, lowercase labels. Brand PNG assets (logos, avatars, social banners) live in the design project's `assets/` folder.
  - The `open_source` section (`#open-source` in `src/pages/index.astro`, the `aws_xray_sdk` package card) is **not** in `Mohamed Abdelsamei.dc.html` — it's real content the design mockup doesn't track. Preserve it (and its nav link) when re-syncing layout from the design file; don't drop it just because the source design omits it.
  - Reusable card/component patterns established in `src/styles/global.css`, reuse rather than inventing new ones for similar content: `.card` (bordered `var(--card)`-background box — used by `work-grid`, `card--solo`, `stack-card`), `.term` (terminal-window chrome — dot-bar header + body — used by the writing section for any future "console output" style content), `.chip` / `.chip--lg` (small bordered tag; `--lg` is the roomier variant used in `also_speaks`), and `.stack-freq` (inline right-aligned frequency/status label on a list row, with `.accent` for a highlighted status like "certified SA").
- `favicon.svg` / `favicon_32.png` / `favicon_180.png` / `favicon.ico` live in `public/` (real files, not a data URI). Google's search-result favicon fetcher and older browsers don't reliably support `<link rel="icon" href="data:...">`; they fall back to requesting `/favicon.ico` at the origin root, and a 404 there is what was showing a generic globe icon in search results. Referenced from `Layout.astro`, in this exact order: `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` (primary/modern, vector), `<link rel="icon" href="/favicon_32.png" sizes="32x32" />` (raster fallback), `<link rel="apple-touch-icon" href="/favicon_180.png" />` (iOS home-screen). `favicon.ico` has **no `<link>` tag** pointing at it anymore, but is deliberately kept in `public/` anyway as a safety net: browsers/crawlers that don't find/support the linked icons are known to probe `/favicon.ico` directly, and an absent file there is exactly what caused the original globe-icon bug. All four were generated from the brand mark (ink rounded-rect + accent block, same shapes as `.logo`/`.logo-block`) with a hand-rolled pure-Python PNG/ICO encoder — if the brand mark ever changes, regenerate all four, don't hand-edit the binaries.
- SEO plumbing: `@astrojs/sitemap` (configured with no extra options) auto-generates `sitemap-index.xml` + `sitemap-0.xml` on every build, covering the homepage and every non-draft blog post automatically — there's no hand-maintained sitemap file and no `lastmod` to remember to bump. `public/robots.txt` points at the single generated `https://mabdelsamei.com/sitemap-index.xml`. `google02b7a32b9c11fcc0.html` is Search Console verification — do not delete.
  - `og-image.png` (1200×630) is the sitewide OG/Twitter fallback, used by both the homepage and any blog post without a per-post `ogImage`; `twitter:card` is always `summary_large_image` since every image involved (default + per-post) is 1200×630. `og-image.jpg` (460×460, the original undersized asset) is kept in `public/` only because it may already be indexed somewhere — nothing links to it anymore.

## Layout & metadata

`Layout.astro` takes `title`, `description`, `ogType` (`'profile' | 'website' | 'article'`), `image` (site-relative, defaults to `/og-image.png`), `publishedTime`/`tags` (emit JSON-LD `BlogPosting` when `ogType="article"`), `navAccent` (`'contact' | 'writing'` — which single nav item gets the `accent` "you are here" styling; home/404 use `contact`, blog pages use `writing`), and `noindex` (used by `404.astro`). It always emits the Person JSON-LD schema; pass `ogType="article"` + `publishedTime` to additionally get `BlogPosting`.

`BlogLayout.astro` wraps `Layout.astro` and appends `— Mohamed Abdelsamei` to whatever `title` it's given — pass the bare post/section title, not the full page title, when using `BlogLayout`.

- **Astro prop gotcha**: when passing a string literal attribute directly on a component tag (e.g. `title="AWS & Identity"`), Astro treats it as a raw string, *not* HTML-decoded — write a literal `&`, not `&amp;`. Writing `&amp;` here produces double-encoded output (`&amp;amp;`) once the prop is later interpolated into HTML via `{title}`. This exact bug bit the site once already; regular HTML body text (not a component prop) is unaffected and uses normal entities (`&mdash;`, `&rsquo;`, etc.) as usual.
- Content and metadata are duplicated across `<title>`, meta description, OG/Twitter tags, and JSON-LD, driven from the props passed into `Layout`/`BlogLayout` at each call site (`src/pages/index.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`) — keep wording in sync across all of them when changing copy.
- Code blocks get wrapped in a terminal-style "code-card" (filename bar + copy button) **client-side**, in `BlogLayout.astro`'s inline script — not via a rehype/AST transform. Astro's Shiki output isn't reachable as a plain hast element tree at the point `markdown.rehypePlugins` run, so a build-time wrap silently does nothing; this was confirmed by testing, not assumed.
- Per-post OG image override: content collection posts have an optional `ogImage` frontmatter field (site-relative path, e.g. `/og/my-post.png`); when set it flows through `[...slug].astro` → `BlogLayout`'s `image` prop → `Layout`'s `og:image`/`twitter:image`/JSON-LD `image`, all in one place. Unset falls back to `/og-image.png`.

## Verification

`npm run build`, then serve `dist/` directly and check both `/` and `/blog/*`:
```
npm run build
python3 -m http.server 8080 --directory dist
```
Since the whole site is now one Astro project, `npm run dev` (or `astro dev --background`) also works for full end-to-end checks — it no longer has the base-path/same-origin-stylesheet blind spot the old split blog/root setup had.

## Conventions

- Design iterations happen on branches (`v2`, `v3`, `v3.1`, `design/*`); `master` is what's live.
- Contact/CTA copy must never solicit freelance, contract, or paid side work. "Open to connect" means networking, open standards, open source, and conversation — keep it that way.
- No city/location in visible prose (hero, footer, meta/OG/Twitter descriptions, JSON-LD `description`) — deliberately removed. The only place location still lives is the JSON-LD `address` structured field (`addressLocality: "Berlin"`), which is metadata for search engines, not copy a visitor reads. Don't re-add "Berlin" to the footer or descriptions as a "fix"; that's reverting an intentional decision.
- Accessibility patterns are deliberate: skip link, `aria-label`s on sections, `aria-hidden` on decorative elements, `prefers-reduced-motion` support in CSS. Preserve them when editing.
  - The literal `##`/`###` prefixes used for the terminal-voice section headers (`.sec-hdr` on the homepage, `.prose-hdr-mark` in blog post bodies) must be a separate `aria-hidden="true"` span, never baked into the heading's own text — otherwise assistive tech and text-extraction tools read/duplicate the decorative marks as real heading content.
  - Adjacent inline `<span>`s inside one text-bearing element (e.g. `.stack-list li`'s skill name + `.stack-freq` tag) need a real space/text node between them, even when a flex `justify-content: space-between` already separates them visually — otherwise extracted/screen-reader text concatenates them with no word boundary (`Node.js / TypeScriptcore`).
  - Same word-boundary hazard, different trigger in `.astro` templates: the Astro compiler trims trailing whitespace at a line-end when the next line starts with a tag — unlike plain static HTML, where a line break between inline elements collapses to a rendered space. Text immediately followed by a link/span (e.g. `writing-note`'s "...at the <a>RSS feed</a>") must have the space and the tag on the *same* line, or the space is silently dropped (`atheRSS feed`).
- Commit messages follow a loose conventional style (`feat:`, `chore:`, `content:`).
