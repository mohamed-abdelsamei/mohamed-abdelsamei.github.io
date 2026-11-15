// /llms-full.txt — the full markdown of every post and project in one file,
// so an agent can take in the whole site with a single request.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ABOUT, AUTHOR, SUMMARY, isPublished, markdownResponse, postMarkdown, projectMarkdown } from '../lib/agent-markdown';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', isPublished)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  const projects = (await getCollection('projects')).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const sections = [...posts.map(postMarkdown), ...projects.map(projectMarkdown)];
  return markdownResponse(`# ${AUTHOR}\n\n> ${SUMMARY}\n\n${ABOUT}\n---\n\n${sections.join('\n---\n\n')}`, 'text/plain');
};
