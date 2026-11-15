// /llms.txt — the llmstxt.org index: who this is, and a link to the markdown
// twin of every page an agent might want, with a one-line description each.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ABOUT, AUTHOR, SITE, SUMMARY, isPublished, markdownResponse } from '../lib/agent-markdown';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', isPublished)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  const projects = (await getCollection('projects')).sort((a, b) => a.data.title.localeCompare(b.data.title));

  const body = `# ${AUTHOR}

> ${SUMMARY}

This is the personal site of ${AUTHOR}: an engineering blog and open-source project case studies. Every post and project below is linked as plain markdown; the HTML page lives at the same path without the \`.md\` suffix (with a trailing slash). The full text of everything is in [llms-full.txt](${SITE}/llms-full.txt).

${ABOUT}
## Blog

${posts.map((p) => `- [${p.data.title}](${SITE}/blog/${p.id}.md): ${p.data.description}`).join('\n')}

## Projects

${projects.map((p) => `- [${p.data.title}](${SITE}/projects/${p.id}.md): ${p.data.description}`).join('\n')}

## Optional

- [RSS feed](${SITE}/blog/rss.xml): new posts
- [GitHub](https://github.com/mohamed-abdelsamei): source code
- [LinkedIn](https://www.linkedin.com/in/mohamed-abdelsamei/): professional profile
`;
  return markdownResponse(body, 'text/plain');
};
