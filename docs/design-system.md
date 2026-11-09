# Design system

`src/styles/tokens.css` owns theme colors, type families, spacing scale, radii, and widths. Change shared values here rather than adding project overrides.

- `global.css`: reset, navigation, links, homepage sections and shared primitives.
- `blog.css`: reading typography, tables, code and architecture figures.
- `case-study.css`: one project layout, facts grid, media frame, contents navigation and next-project link.

Project pages use the same template and responsive rules. Titles, category, headline, summary, facts, optional icon, image dimensions, alt text and caption are validated content fields. Adding a project requires a Markdown entry, not a new stylesheet or a conditional on its ID.

Use sans-serif for display and reading text; monospace for labels, navigation and code. Use semantic theme tokens for text, borders and surfaces. Status must be expressed in words as well as color. Both themes share spacing and typography. Mobile contents use the same disclosure component for every project.

Verify changes with `npm run check`, `npm run build`, and `npm run check-site`; inspect desktop and phone rendering of both project pages.
