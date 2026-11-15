// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

import rehypePostEnhance from './src/lib/rehype-post-enhance.mjs';

import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// Sitemap <lastmod> for blog posts: updatedDate ?? pubDate, read straight from
// frontmatter (content collections aren't available in config). Other URLs get
// no lastmod rather than a made-up one — Google ignores lastmod it can't trust.
const BLOG_DIR = new URL('./src/content/blog/', import.meta.url);
const postLastmod = Object.fromEntries(
  readdirSync(BLOG_DIR)
    .filter((f) => /^[^_].*\.mdx?$/.test(f))
    .map((f) => {
      const fm = readFileSync(new URL(f, BLOG_DIR), 'utf8').split('---')[1] ?? '';
      const field = (/** @type {string} */ k) => fm.match(new RegExp(`^${k}:\\s*["']?([^"'\\n]+)`, 'm'))?.[1];
      const date = field('updatedDate') ?? field('pubDate');
      return [`https://mabdelsamei.com/blog/${f.replace(/\.mdx?$/, '')}/`, date && new Date(date).toISOString()];
    })
    .filter(([, d]) => d)
);

// https://astro.build/config
export default defineConfig({
  site: 'https://mabdelsamei.com',
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const lastmod = postLastmod[item.url];
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'css-variables' },
    // Astro 7 deprecated the top-level `markdown.rehypePlugins` shortcut in
    // favour of an explicit `unified()` processor from @astrojs/markdown-remark
    // (the shortcut auto-created one internally anyway). This keeps the same
    // remark/rehype pipeline that rehypePostEnhance runs on.
    processor: unified({
      rehypePlugins: [rehypePostEnhance],
    }),
  },
});
