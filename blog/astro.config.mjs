// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

import rehypePostEnhance from './src/lib/rehype-post-enhance.mjs';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mabdelsamei.com',
  base: '/blog',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'css-variables' },
    rehypePlugins: [rehypePostEnhance],
  },
});