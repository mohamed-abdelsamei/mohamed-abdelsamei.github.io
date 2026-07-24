// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

import rehypePostEnhance from './src/lib/rehype-post-enhance.mjs';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mabdelsamei.com',
  integrations: [mdx(), sitemap()],
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
