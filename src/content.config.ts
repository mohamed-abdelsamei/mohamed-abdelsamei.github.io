import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    // Optional per-post social-card image (site-relative, e.g. "/og/my-post.jpg").
    // Falls back to the site-wide /og-image.jpg when unset — see CLAUDE.md.
    ogImage: z.string().optional(),
    // Optional in-page poster shown between the post header and body
    // (site-relative, 3:1, e.g. "/posters/my-post.png"). heroAlt is the
    // image's alt text — required whenever heroImage is set.
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({ title: z.string(), description: z.string(), repository: z.string().url(), status: z.string(),
    category: z.string(), headline: z.string(), summary: z.string(),
    format: z.string(), stack: z.string(), contribution: z.string(),
    image: z.string(), imageAlt: z.string(), imageCaption: z.string(),
    imageWidth: z.number().positive(), imageHeight: z.number().positive(),
    icon: z.string().optional(),
    seoTitle: z.string(), ogImage: z.string(), ogAlt: z.string(),
    languages: z.string(), cardTitle: z.string(), cardSubtitle: z.string(),
  }),
});
export const collections = { blog, projects };
