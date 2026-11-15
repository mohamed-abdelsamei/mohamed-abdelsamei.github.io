# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mohamed Abdelsamei's personal site (mabdelsamei.com): a single unified Astro project covering both the homepage and the blog under `/blog`. Custom domain is set in `public/CNAME`; `public/.nojekyll` disables Jekyll processing.

**Deployment is fully automatic — a `git push` to `master` is the only step.** `.github/workflows/deploy.yml` runs `npm ci`, `npm run check` (astro check), `npm run build`, then `npm run check-site` and `npm run check-seo` — any failure stops the deploy — and uploads `dist/` directly as the Pages artifact (no manual file assembly). Everything else the deploy needs is handled inside the workflow, so no manual settings or API calls are ever required:
- The `actions/configure-pages@v5` step asserts the repo's Pages config on every run — enabling Pages and forcing the build source to "GitHub Actions" (build type `workflow`), so it self-heals if the Settings → Pages source ever drifts back to legacy branch/Jekyll (which is what causes the redundant `pages-build-deployment` Jekyll run to fire and fail on `.astro` frontmatter).
- The custom domain re-asserts itself from `public/CNAME` → `dist/CNAME` on every deploy, and GitHub auto-purges the Fastly CDN cache on each deployment.
- **Never** partially `PUT` the Pages config via `gh api` (e.g. `-f build_type=workflow` alone) — the API replaces rather than merges, so omitting `cname` silently drops the custom domain and 404s the site until the next deploy re-sets it. The workflow is the source of truth; let it do the work.

Toolchain: Node ≥ 22.23.4 (Astro 7.4.12's floor; `engines` and `.nvmrc` say `22`, and CI's `setup-node` `node-version: 22` resolves to the latest 22.x). TypeScript stays on 6.x — `@astrojs/check` peers on `^5 || ^6`, so don't take TypeScript 7 until it does. `package.json` `overrides` pins `linkinator`'s `glob` to `^14.0.6`: linkinator 8.1.0 (latest) still asks for `glob@^13`, every version of which is in GHSA-3g3m-2fjr-6pw4 / minimatch GHSA-g3hv-75wg-m249, and `npm audit fix --force`'s "fix" is a downgrade to linkinator 4. Drop the override once linkinator ships with glob ≥ 14.0.2; `npm run check-links` proves it still works. Content schemas import `z` from `astro/zod` (the `astro:content` re-export is deprecated) and use zod 4 top-level formats (`z.url()`, not `z.string().url()`).

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
    projects/
      index.astro            project listing (CollectionPage + BreadcrumbList JSON-LD;
                              exempt from check-seo's case-study rules)
      [...slug].astro         case-study page (getStaticPaths over the projects collection);
                              "All projects" link and breadcrumb point to /projects/
  content/
    blog/*.md              Markdown/MDX post entries
    projects/*.md          case-study entries (all fields required — see schema)
  content.config.ts        two collections: `blog` (title, description, pubDate,
                            optional updatedDate, draft, tags, optional
                            ogImage/heroImage/heroAlt) and `projects` (repository,
                            status, seoTitle, ogImage/ogAlt, card*/image* fields, …)
  styles/
    tokens.css              design tokens only (colors, spacing, type scale) —
                             @imported by global.css and also read by
                             scripts/generate-social-cards.py
    global.css              all site styling (was root style.css) —
                             imported once by Layout.astro, not linked as a public asset
    case-study.css          project case-study page styles (imported by projects/[...slug])
    blog.css                 prose typography, Shiki code-block coloring (via Astro's
                              `--astro-code-*` vars, not `--shiki-*`), blog-only tokens
  lib/
    rehype-post-enhance.mjs  markdown rehype plugin — wired via the explicit
                             `unified({ rehypePlugins: [...] })` processor in
                             astro.config.mjs (Astro 7 deprecated the top-level
                             `markdown.rehypePlugins` shortcut; don't reintroduce it)
public/
  CNAME, .nojekyll, robots.txt, sitemap covers are generated (not here) — see SEO below
  favicon.ico/.svg/_32.png/_180.png, og-image.jpg/.png, google02b7a32b9c11fcc0.html,
  og/*, og/projects/* (generated), posters/* (per-post assets)
  The legacy /feed.xml URL is generated by src/pages/feed.xml.js using the same
  handler as /blog/rss.xml, so existing subscribers receive published posts.
scripts/
  check-site.py             internal-link + basic a11y checks over dist/ (CI gate)
  check-seo.py              titles, descriptions, canonicals, social images, JSON-LD,
                             sitemap inclusion over dist/ (CI gate)
  generate-social-cards.py  renders public/og/projects/*.png from project frontmatter +
                             tokens.css; needs `--browser <chrome-headless-shell>`; run by
                             hand when a project's card fields change, commit the PNGs
```

Astro's `public/` directory is copied to the build output verbatim, dotfiles included — this is why CI no longer needs an explicit file allowlist. Adding a new static file just means dropping it in `public/`.

- Design source of truth: the user's claude.ai/design project "Personal portfolio design" (id `96d6525f-757d-454b-be9e-e65bbb3dbda4`) — layout from `Mohamed Abdelsamei.dc.html`, brand rules from `Brand Guide v2.dc.html` (fetch via the DesignSync tool). Key brand rules: single typeface JetBrains Mono (400/500/700, italic for asides); dark theme is default (ink `#0b0d0c`, phosphor accent `#4ade8f`), light theme is paper `#fafaf7` with forest accent `#0b7a48` via `:root[data-theme='light']`; the logo is lowercase `ma` + an accent block underscore off the baseline (`.logo` / `.logo-block`, never a `_` character, never uppercase); the favicon is the accent block alone on ink; accent is punctuation (≤6% of any view, never body copy, never a surface); text on accent fills uses the theme-aware `--on-accent` token (`--ink` `#0b0d0c` in dark, `#fafaf7` in light) — **not** a hardcoded `--ink`, since the accent itself flips from light phosphor (dark theme) to dark forest (light theme), so the same literal ink text that contrasts fine in dark mode fails WCAG AA against the light-mode accent (~3.6:1, needs 4.5:1). This bit `.btn--primary`, `.skip-link`, and `::selection` once already — always use `var(--on-accent)` for text sitting on `var(--accent)`, never `var(--ink)` directly; voice: `##` sections, `//` annotations, `$` prompts, CTAs as commands, lowercase labels. Brand PNG assets (logos, avatars, social banners) live in the design project's `assets/` folder.
  - The `open_source` section (`#open-source` in `src/pages/index.astro`, the `aws_xray_sdk` package card) is **not** in `Mohamed Abdelsamei.dc.html` — it's real content the design mockup doesn't track. Preserve it (and its nav link) when re-syncing layout from the design file; don't drop it just because the source design omits it.
  - Reusable card/component patterns established in `src/styles/global.css`, reuse rather than inventing new ones for similar content: `.card` (bordered `var(--card)`-background box — used by `work-grid`, `card--solo`, `stack-card`), `.term` (terminal-window chrome — dot-bar header + body — used by the writing section for any future "console output" style content), `.chip` / `.chip--lg` (small bordered tag; `--lg` is the roomier variant used in `also_speaks`), and `.stack-freq` (inline right-aligned frequency/status label on a list row, with `.accent` for a highlighted status like "certified SA").
- `favicon.svg` / `favicon_32.png` / `favicon_180.png` / `favicon.ico` live in `public/` (real files, not a data URI). Google's search-result favicon fetcher and older browsers don't reliably support `<link rel="icon" href="data:...">`; they fall back to requesting `/favicon.ico` at the origin root, and a 404 there is what was showing a generic globe icon in search results. Referenced from `Layout.astro`, in this exact order: `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` (primary/modern, vector), `<link rel="icon" href="/favicon_32.png" sizes="32x32" />` (raster fallback), `<link rel="apple-touch-icon" href="/favicon_180.png" />` (iOS home-screen). `favicon.ico` has **no `<link>` tag** pointing at it anymore, but is deliberately kept in `public/` anyway as a safety net: browsers/crawlers that don't find/support the linked icons are known to probe `/favicon.ico` directly, and an absent file there is exactly what caused the original globe-icon bug. All four were generated from the brand mark (ink rounded-rect + accent block, same shapes as `.logo`/`.logo-block`) with a hand-rolled pure-Python PNG/ICO encoder — if the brand mark ever changes, regenerate all four, don't hand-edit the binaries.
- SEO plumbing: `@astrojs/sitemap` auto-generates `sitemap-index.xml` + `sitemap-0.xml` on every build, covering the homepage, `/blog/`, every non-draft post, and the projects pages — there's no hand-maintained sitemap file. Blog post entries get `<lastmod>` = `updatedDate ?? pubDate`, read from frontmatter by a `serialize` hook in `astro.config.mjs` (content collections aren't available in config); other URLs deliberately get none rather than a fake one. So the only thing to remember is setting `updatedDate` when you materially revise a post. `public/robots.txt` points at the single generated `https://mabdelsamei.com/sitemap-index.xml`. `google02b7a32b9c11fcc0.html` is Search Console verification — do not delete.
  - `og-image.png` (1200×630) is the sitewide OG/Twitter fallback, used by both the homepage and any blog post without a per-post `ogImage`; `twitter:card` is always `summary_large_image` since every image involved (default + per-post) is 1200×630. `og-image.jpg` (460×460, the original undersized asset) is kept in `public/` only because it may already be indexed somewhere — nothing links to it anymore.
- Agent-friendly output (for LLM agents/crawlers), all generated at build from the same content collections as the HTML, so it can't drift — never hand-write these files:
  - `/llms.txt` (`src/pages/llms.txt.ts`, llmstxt.org format) — summary + a link to every post/project's markdown twin; `/llms-full.txt` (`src/pages/llms-full.txt.ts`) — the full text of everything in one file.
  - Markdown twins at `/blog/<slug>.md` and `/projects/<slug>.md` (`src/pages/{blog,projects}/[slug].md.ts`), rendered by `src/lib/agent-markdown.ts` (title, description, URL/date/tag metadata, hero/project image with alt, then the body). Body processing skips fenced code entirely and, in prose: makes site-relative links absolute (inline, reference-style, raw `src`/`href`), converts the raw-HTML figure markup case studies use (`<figure><ol><li><strong>…</strong><span>…</span>`) to a numbered markdown list — so tag-stripping readers don't get run-together words — and, for `.mdx` entries, drops `import`/`export` lines and **fails the build** on any `<Component />`, since a component has no markdown form (add a plain-markdown fallback first). If new raw-HTML patterns enter content, extend `htmlToMarkdown` — `check-seo` fails on leftover `<li>`/`<span>`/`<figure>`/JSX in a twin. Each HTML page advertises its twin via `<link rel="alternate" type="text/markdown">` (Layout's `markdownPath` prop). `llms.txt` is discovered by its root path convention, so pages don't link it. Twins use the same draft rule as the HTML routes (`isPublished`: drafts in dev, never in production).
  - Both `llms.txt` and `llms-full.txt` start with an `## About` section (`ABOUT` in `agent-markdown.ts`: focus areas, tools, contact) mirroring the homepage's about/stack/contact copy — update it when that homepage copy changes.
  - **Crawler policy (decided by the owner, 2026-11-15): allow everything, AI training crawlers included** (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, …). Don't add training-bot opt-outs as a "privacy fix" — that reverses a deliberate decision. `public/robots.txt` lets every agent crawl everything, but disallows `/*.md$` for the major search-engine crawlers (Googlebot, Bingbot, Applebot, DuckDuckBot, YandexBot, Baiduspider) so they don't index the twins as duplicate content. Don't move that Disallow into the `*` group — it would hide the twins from the agents they exist for. A Disallow blocks crawling, not indexing: if Search Console shows `.md` URLs as "Indexed, though blocked by robots.txt", drop the Disallow and let duplicate handling fold them in (GitHub Pages can't send `X-Robots-Tag`).
  - The bio is one constant, `PERSON_DESCRIPTION` in `src/lib/site.ts`, used by both the Person JSON-LD and the llms.txt summary — edit it there, never inline a copy. No location, like all copy.
  - `check-seo` enforces it: every post/project page links an existing twin; `llms.txt` lists every twin, has an About section and no broken links; `llms-full.txt` contains every twin's full body; no twin leaks MDX `import`/`export`, raw HTML/JSX, or site-relative links.
- More SEO plumbing: non-noindex pages emit `robots: index, follow, max-image-preview:large, max-snippet:-1` (large image previews in Search/Discover). Blog posts get `BlogPosting` with `dateModified` (from optional `updatedDate` frontmatter — set it when you materially revise a post), `mainEntityOfPage`, author/publisher `@id` refs, `article:*` OG tags, and a `BreadcrumbList` (Home › Blog › post); `/blog/` gets `Blog` + `BreadcrumbList` JSON-LD.
- Fonts are self-hosted: JetBrains Mono 400/500/700/400-italic via `@fontsource/jetbrains-mono`, imported at the top of `Layout.astro` and bundled into our own origin. **Never go back to `fonts.googleapis.com`** — it sends every visitor's IP to Google, which LG München I (3 O 17493/20, 2022) held to require consent, and would break the "no consent banner needed" analytics stance below. `check-seo` fails on any `fonts.googleapis.com`/`fonts.gstatic.com` reference in built HTML.
- Analytics: Umami Cloud, pageviews only, as a single `is:inline` `<script>` at the end of `Layout.astro`'s `<head>` — that one spot covers every page, since everything (including the `BlogLayout`-wrapped blog pages) renders through `Layout`. It's **double-gated on purpose**: `import.meta.env.PROD` keeps it out of `astro dev` entirely, and `data-domains="mabdelsamei.com"` stops it firing when a production `dist/` is served from `localhost` — which is exactly the verification flow above, so removing either guard means local previews silently pollute real stats. The `data-website-id` is public by nature (it's in the HTML of every page), so it's deliberately hardcoded rather than threaded through a GitHub Actions env/secret — keeping "push is the only step" true and a fresh-clone build identical to CI. Umami is cookieless and collects no PII, so **no consent banner is required** — that's the reason this provider was chosen over GA4; don't "fix" the missing banner by adding one. Consent (§25 TDDDG / ePrivacy) and transparency (GDPR Art. 13) are separate duties, and only the second one applies here: Umami counts uniques via a server-side hash of IP + user agent against a daily-rotating salt, so raw IPs are never stored but *are* briefly processed under legitimate interest. That's covered proportionally by the footer disclosure in `Layout.astro` (`cookieless analytics, no personal data retained`, appended to the copyright span with the same `&middot;` separator the line already uses) — keep that sentence if you rewrite the footer. If the site ever grows a form, newsletter, or account system, upgrade it to a real `/privacy` page. Ad blockers commonly block `cloud.umami.is`, so your own visits may not register — test in a clean profile before concluding it's broken.

## Layout & metadata

`Layout.astro` takes `title`, `description`, `ogType` (`'profile' | 'website' | 'article'`), `image` (site-relative, defaults to `/og-image.png`), `imageAlt` (defaults to `title`), `structuredData` (extra JSON-LD objects appended after the built-in schemas — used by the projects pages for CollectionPage/SoftwareSourceCode/BreadcrumbList), `publishedTime`/`tags` (emit JSON-LD `BlogPosting` when `ogType="article"`), `navAccent` (`'contact' | 'writing' | 'projects'` — which single nav item gets the `accent` "you are here" styling; home/404 use `contact`, blog pages use `writing`, projects pages use `projects`), and `modifiedTime` (→ `dateModified`/`article:modified_time`), `markdownPath` (agent markdown twin, see above), and `noindex` (used by `404.astro`). It always emits the Person JSON-LD schema and the `WebSite` entity (`@id` `https://mabdelsamei.com/#website`, `name: 'Mohamed Abdelsamei'`, `alternateName: 'mabdelsamei'`); pass `ogType="article"` + `publishedTime` to additionally get `BlogPosting`, which links back via `isPartOf` → `#website` (its `headline` has the title suffix stripped). The `WebSite` entity is what sets Google's **site name** (the line above the URL in results) — but Google reads it from the homepage copy only and applies it domain-wide, so if results show `mabdelsamei.com` instead of the name, the fix is homepage signals + Search Console reindexing, not per-page markup. The inner-page copies exist only so `@id` references resolve on-page. Don't add `mabdelsamei.com` back to `alternateName` — it endorses the bare-domain fallback.

Title convention: every page except the homepage ends with ` — Mohamed Abdelsamei` (em dash, never `|`); the homepage leads with the name instead. `check-seo` enforces this.

`BlogLayout.astro` wraps `Layout.astro` and appends `— Mohamed Abdelsamei` to whatever `title` it's given — pass the bare post/section title, not the full page title, when using `BlogLayout`.

- **Astro prop gotcha**: when passing a string literal attribute directly on a component tag (e.g. `title="AWS & Identity"`), Astro treats it as a raw string, *not* HTML-decoded — write a literal `&`, not `&amp;`. Writing `&amp;` here produces double-encoded output (`&amp;amp;`) once the prop is later interpolated into HTML via `{title}`. This exact bug bit the site once already; regular HTML body text (not a component prop) is unaffected and uses normal entities (`&mdash;`, `&rsquo;`, etc.) as usual.
- Content and metadata are duplicated across `<title>`, meta description, OG/Twitter tags, and JSON-LD, driven from the props passed into `Layout`/`BlogLayout` at each call site (`src/pages/index.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/projects/index.astro`, `src/pages/projects/[...slug].astro`) — keep wording in sync across all of them when changing copy.
- Code blocks get wrapped in a terminal-style "code-card" (filename bar + copy button) **client-side**, in `BlogLayout.astro`'s inline script — not via a rehype/AST transform. Astro's Shiki output isn't reachable as a plain hast element tree at the point `markdown.rehypePlugins` run, so a build-time wrap silently does nothing; this was confirmed by testing, not assumed.
- Per-post OG image override: content collection posts have an optional `ogImage` frontmatter field (site-relative path, e.g. `/og/my-post.png`); when set it flows through `[...slug].astro` → `BlogLayout`'s `image` prop → `Layout`'s `og:image`/`twitter:image`/JSON-LD `image`, all in one place. Unset falls back to `/og-image.png`.

## Verification

`npm run build`, then serve `dist/` directly and check both `/` and `/blog/*`:
```
npm run build
python3 -m http.server 8080 --directory dist
```
Then run the same gates CI runs, so a push can't fail on something you could have caught locally: `npm run check && npm run check-site && npm run check-seo` (the last two read `dist/`, so build first).
Since the whole site is now one Astro project, `npm run dev` (or `astro dev --background`) also works for full end-to-end checks — it no longer has the base-path/same-origin-stylesheet blind spot the old split blog/root setup had.

`npm run check-links` (wraps `linkinator`, a dev dependency) crawls the built `dist/` and reports any broken internal link or asset reference — canonical URLs, OG images, hero posters, RSS/sitemap links, everything. It rewrites `https://mabdelsamei.com` back to the local `dist/` server via `--url-rewrite-search`/`--url-rewrite-replace` so the site's own absolute URLs (required for OG/canonical tags) get checked locally instead of hitting the real internet. Run it after every build, especially after touching frontmatter image paths or restructuring — it's exactly the kind of check that would have caught the `/blog/og/...`/`/blog/posters/...` path bug (leftover from when the blog was mounted at a `/blog` base) that once broke every per-post social-card image and hero poster after the base/root unification.

## Conventions

- Design iterations happen on branches (`v2`, `v3`, `v3.1`, `design/*`); `master` is what's live.
- Contact/CTA copy must never solicit freelance, contract, or paid side work. "Open to connect" means networking, open standards, open source, and conversation — keep it that way.
- No city/location in visible prose (hero, footer, meta/OG/Twitter descriptions, JSON-LD `description`) — deliberately removed. The only place location still lives is the JSON-LD `address` structured field (`addressLocality: "Berlin"`), which is metadata for search engines, not copy a visitor reads. Don't re-add "Berlin" to the footer or descriptions as a "fix"; that's reverting an intentional decision. This extends to location *proxies*, not just city names: the footer's original `berlin, de &middot; utc+1` pair (from the `Design/dc terminal` redesign) had the city stripped first and the `utc+1` timezone dropped later for the same reason — UTC+1 narrows the reader to Central European Time, so it's a weaker form of the same signal. Don't reintroduce a timezone, region, or "based in …" line to the footer.
- Accessibility patterns are deliberate: skip link, `aria-label`s on sections, `aria-hidden` on decorative elements, `prefers-reduced-motion` support in CSS. Preserve them when editing.
  - The literal `##`/`###` prefixes used for the terminal-voice section headers (`.sec-hdr` on the homepage, `.prose-hdr-mark` in blog post bodies) must be a separate `aria-hidden="true"` span, never baked into the heading's own text — otherwise assistive tech and text-extraction tools read/duplicate the decorative marks as real heading content.
  - Adjacent inline `<span>`s inside one text-bearing element (e.g. `.stack-list li`'s skill name + `.stack-freq` tag) need a real space/text node between them, even when a flex `justify-content: space-between` already separates them visually — otherwise extracted/screen-reader text concatenates them with no word boundary (`Node.js / TypeScriptcore`).
  - Same word-boundary hazard, different trigger in `.astro` templates: the Astro compiler trims trailing whitespace at a line-end when the next line starts with a tag — unlike plain static HTML, where a line break between inline elements collapses to a rendered space. Text immediately followed by a link/span (e.g. `writing-note`'s "...at the <a>RSS feed</a>") must have the space and the tag on the *same* line, or the space is silently dropped (`atheRSS feed`).
- Commit messages follow a loose conventional style (`feat:`, `chore:`, `content:`).
