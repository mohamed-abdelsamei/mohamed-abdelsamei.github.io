"""Validate built internal links and basic HTML accessibility; no network requests.
This does not replace browser-based accessibility testing.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
root = Path('dist').resolve()
errors = []
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.path=path; self.ids=set(); self.links=[]; self.h1=0; self.main=0; self.lang=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: errors.append(f'{self.path}: duplicate ID {a["id"]}')
            self.ids.add(a['id'])
        if tag=='html': self.lang=bool(a.get('lang'))
        if tag=='h1': self.h1+=1
        if tag=='main': self.main+=1
        if tag=='img' and 'alt' not in a: errors.append(f'{self.path}: image missing alt attribute')
        if tag in ('a','link','img','script'):
            url=a.get('href') or a.get('src')
            if url: self.links.append(url)
pages={}
for path in root.rglob('*.html'):
    if path.name.startswith('google'): continue
    page=Page(path.relative_to(root)); page.feed(path.read_text()); pages[path]=page
    if page.h1!=1 or page.main!=1 or not page.lang:
        errors.append(f'{page.path}: expected language, one main landmark and one H1')
assert pages, 'No built pages found; run npm run build first'
count=0
for path,page in pages.items():
    for url in page.links:
        u=urlsplit(url)
        if u.scheme or u.netloc: continue
        target=(root/unquote(u.path).lstrip('/')) if u.path.startswith('/') else (path.parent/unquote(u.path)) if u.path else path
        target=target.resolve()
        if target.is_dir(): target=target/'index.html'
        if not target.exists(): errors.append(f'{page.path}: missing {url}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
            errors.append(f'{page.path}: missing anchor {url}')
        count+=1
if errors: raise SystemExit('\n'.join(errors))
print(f'Passed: {len(pages)} pages, {count} internal references, and basic HTML accessibility checks.')
