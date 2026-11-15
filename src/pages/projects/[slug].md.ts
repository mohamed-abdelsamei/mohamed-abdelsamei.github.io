import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { markdownResponse, projectMarkdown } from '../../lib/agent-markdown';

export const getStaticPaths = (async () =>
  (await getCollection('projects')).map((project) => ({
    params: { slug: project.id },
    props: { project },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  markdownResponse(projectMarkdown((props as { project: CollectionEntry<'projects'> }).project));
