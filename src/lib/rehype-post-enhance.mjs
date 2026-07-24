import { visit } from 'unist-util-visit';

const HEADING_MARK = { h2: '##', h3: '###' };

function textNode(value) {
  return { type: 'text', value };
}

/**
 * Prefixes h2/h3 in rendered post HTML with an accent-colored "##"/"###"
 * mark, matching the `## section` voice used elsewhere on the site.
 *
 * (Code blocks are wrapped into the terminal-style "code-card" chrome
 * client-side instead — see BlogLayout.astro. Astro's Shiki output isn't
 * a plain hast element tree at the point rehype plugins run, so a
 * build-time AST transform can't reliably reach it here.)
 */
export default function rehypePostEnhance() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      const mark = HEADING_MARK[node.tagName];
      if (mark) {
        node.children.unshift(
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['prose-hdr-mark'], ariaHidden: 'true' },
            children: [textNode(mark)],
          },
          textNode(' ')
        );
      }
    });
  };
}
