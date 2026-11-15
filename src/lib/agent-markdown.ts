// Plain-markdown renderings of site content for LLM agents and other
// non-browser readers: /llms.txt, /llms-full.txt, and the per-page `.md` twins.
// Built from the same content collections as the HTML pages, so they can't drift.
//
// Note: the Content-Type set by markdownResponse only matters under `astro dev`;
// in the static build GitHub Pages derives it from the file extension.
import type { CollectionEntry } from 'astro:content';
import { AUTHOR, PERSON_DESCRIPTION, SITE } from './site';

export { AUTHOR, SITE };
export const SUMMARY = PERSON_DESCRIPTION;

/** Same draft rule as the HTML routes: drafts render in dev, never in production. */
export const isPublished = ({ data }: CollectionEntry<'blog'>) => (import.meta.env.PROD ? !data.draft : true);

/** Homepage profile for agents (mirrors src/pages/index.astro's about/stack/contact copy; no location). */
export const ABOUT = `## About

${AUTHOR} is a backend engineer and builder: ten years building backend systems. Today the focus is identity for humans and AI agents, reliable infrastructure on AWS, and tools that make engineering a little easier.

Focus areas:

1. **Identity & delegation**: verifiable credentials, OID4VP, OID4VCI, and the delegation models that let agents act on someone's behalf.
2. **Infrastructure & reliability**: cloud-native services on AWS, distributed systems, observability, and safe execution environments for agents.
3. **Technical leadership**: system design across product, infrastructure, and security; mentoring engineers to own architecture as well as implementation.

Tools: TypeScript, Node.js, Dart, AWS, CDK, DynamoDB, Docker, OAuth 2.0, OIDC.

Contact (open to conversations about identity, backend systems, and open source):

- Email: mohamed@mabdelsamei.com
- [GitHub](https://github.com/mohamed-abdelsamei)
- [LinkedIn](https://www.linkedin.com/in/mohamed-abdelsamei/)
- [Homepage](${SITE}/)
`;

const FENCE = /^(```|~~~)/;

/** Apply `fn` to prose only, leaving fenced code blocks byte-for-byte untouched. */
function mapProse(md: string, fn: (prose: string) => string): string {
  const out: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => { if (buf.length) out.push(fn(buf.join('\n'))); buf = []; };
  for (const line of md.split('\n')) {
    if (FENCE.test(line.trim())) {
      if (!inFence) { flush(); inFence = true; out.push(line); } else { inFence = false; out.push(line); }
    } else if (inFence) out.push(line);
    else buf.push(line);
  }
  flush();
  return out.join('\n');
}

/** Site-relative links → absolute: inline `](/x)`, reference `[id]: /x`, and raw `src`/`href="/x"`. */
const absolutize = (prose: string) =>
  prose
    .replace(/\]\(<?\/(?!\/)/g, (m) => m.replace('/', `${SITE}/`))
    .replace(/^(\s*\[[^\]]+\]:\s*<?)\/(?!\/)/gm, `$1${SITE}/`)
    .replace(/\b(src|href)="\/(?!\/)/g, `$1="${SITE}/`);

/** The few raw-HTML constructs content uses, as plain markdown (keeps word boundaries). */
const htmlToMarkdown = (prose: string) =>
  prose
    .replace(/<figcaption>([\s\S]*?)<\/figcaption>/g, '*$1*\n')
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, items: string) => {
      let n = 0;
      return items.replace(/<li>([\s\S]*?)<\/li>/g, (_m, li: string) =>
        `${++n}. ${li.replace(/<strong>([\s\S]*?)<\/strong>\s*<span>([\s\S]*?)<\/span>/, '**$1**: $2')}`);
    })
    .replace(/<p>([\s\S]*?)<\/p>/g, '\n$1\n')
    .replace(/<\/?(figure|span|div)[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n');

/** MDX: drop ESM import/export lines; components can't be represented, so fail loudly. */
function stripMdx(prose: string, id: string): string {
  const cleaned = prose.replace(/^(import|export)\s.*$/gm, '');
  const component = cleaned.match(/<[A-Z][\w.]*[\s/>]/);
  if (component) throw new Error(`agent-markdown: MDX component ${component[0]} in "${id}" has no markdown form — add a markdown fallback before publishing.`);
  return cleaned;
}

function renderBody(entry: { id: string; body?: string; filePath?: string }): string {
  const isMdx = entry.filePath?.endsWith('.mdx') ?? false;
  return mapProse((entry.body ?? '').trim(), (prose) => {
    const p = isMdx ? stripMdx(prose, entry.id) : prose;
    return absolutize(htmlToMarkdown(p));
  }).trim();
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const image = (src: string | undefined, alt: string | undefined) =>
  src ? `\n![${alt ?? ''}](${new URL(src, SITE).href})\n` : '';

export function postMarkdown(post: CollectionEntry<'blog'>): string {
  const { title, description, pubDate, updatedDate, tags, heroImage, heroAlt } = post.data;
  const meta = [
    `- URL: ${SITE}/blog/${post.id}/`,
    `- Author: ${AUTHOR}`,
    `- Published: ${isoDate(pubDate)}`,
    updatedDate && `- Updated: ${isoDate(updatedDate)}`,
    tags.length > 0 && `- Tags: ${tags.join(', ')}`,
  ].filter(Boolean);
  return `# ${title}\n\n> ${description}\n\n${meta.join('\n')}\n${image(heroImage, heroAlt)}\n${renderBody(post)}\n`;
}

export function projectMarkdown(project: CollectionEntry<'projects'>): string {
  const d = project.data;
  const meta = [
    `- URL: ${SITE}/projects/${project.id}/`,
    `- Repository: ${d.repository}`,
    `- Status: ${d.status}`,
    `- Category: ${d.category}`,
    `- Format: ${d.format}`,
    `- Built with: ${d.stack}`,
    `- Languages: ${d.languages}`,
    `- Author's contribution: ${d.contribution}`,
  ];
  return `# ${d.title}\n\n> ${d.description}\n\n**${d.headline}** ${d.summary}\n\n${meta.join('\n')}\n${image(d.image, d.imageAlt)}\n${renderBody(project)}\n`;
}

export const markdownResponse = (body: string, type = 'text/markdown') =>
  new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
