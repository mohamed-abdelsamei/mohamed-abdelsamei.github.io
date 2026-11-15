import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, markdownResponse, postMarkdown } from '../../lib/agent-markdown';

export const getStaticPaths = (async () =>
  (await getCollection('blog', isPublished)).map((post) => ({
    params: { slug: post.id },
    props: { post },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  markdownResponse(postMarkdown((props as { post: CollectionEntry<'blog'> }).post));
