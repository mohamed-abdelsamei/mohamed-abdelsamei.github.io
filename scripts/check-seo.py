"""Check generated SEO metadata locally; no search-engine or network calls."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
import re
import struct
import xml.etree.ElementTree as ET
root=Path('dist')
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.meta={};self.canonical=[];self.title='';self.in_title=False;self.in_schema=False;self.schema_text='';self.schemas=[];self.alternates={}
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t=='meta': self.meta[a.get('name') or a.get('property')]=a.get('content','')
        if t=='link' and a.get('rel')=='canonical': self.canonical.append(a['href'])
        if t=='link' and a.get('rel')=='alternate': self.alternates[a.get('type')]=a.get('href')
        if t=='title': self.in_title=True
        if t=='script' and a.get('type')=='application/ld+json': self.in_schema=True; self.schema_text=''
    def handle_data(self,data):
        if self.in_title: self.title+=data
        if self.in_schema: self.schema_text+=data
    def handle_endtag(self,t):
        if t=='title': self.in_title=False
        if t=='script' and self.in_schema:
            self.schemas.append(json.loads(self.schema_text));self.in_schema=False
seen_titles=set();seen_canonicals=set();count=0
sitemap=set()
for f in root.glob('sitemap-*.xml'):
    sitemap.update(e.text for e in ET.parse(f).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'))
for path in root.rglob('*.html'):
    if path.name.startswith('google'): continue
    html=path.read_text();p=Page();p.feed(html)
    assert 'fonts.googleapis.com' not in html and 'fonts.gstatic.com' not in html, f'{path}: third-party font request (fonts are self-hosted for GDPR)'
    assert p.title and p.title not in seen_titles, f'{path}: duplicate or missing title'
    seen_titles.add(p.title)
    assert len(p.canonical)==1 and p.canonical[0].startswith('https://mabdelsamei.com/'), f'{path}: invalid canonical'
    canonical=p.canonical[0]
    assert canonical not in seen_canonicals, f'{path}: duplicate canonical'
    seen_canonicals.add(canonical)
    for key in ['description','og:title','og:description','og:url','og:image','og:image:alt','twitter:title','twitter:description','twitter:image','twitter:image:alt']:
        assert p.meta.get(key), f'{path}: missing {key}'
    assert p.meta['og:title']==p.title==p.meta['twitter:title']
    assert p.meta['og:url']==canonical
    assert p.meta['description']==p.meta['og:description']==p.meta['twitter:description']
    image=root/urlsplit(p.meta['og:image']).path.lstrip('/')
    assert image.exists(), f'{path}: missing social image'
    if image.suffix=='.png':
        assert struct.unpack('>II',image.read_bytes()[16:24])==(1200,630), f'{path}: incorrect image dimensions'
    if 'noindex' not in p.meta.get('robots',''): assert canonical in sitemap, f'{path}: absent from sitemap'
    assert any(s.get('@type')=='Person' for s in p.schemas)
    # Google's site name comes from the homepage copy; every page carries the same entity.
    sites=[s for s in p.schemas if s.get('@type')=='WebSite']
    assert len(sites)==1 and sites[0].get('@id')=='https://mabdelsamei.com/#website' and sites[0].get('name')=='Mohamed Abdelsamei', f'{path}: missing or duplicate branded WebSite schema'
    for s in p.schemas:
        if s.get('@type')=='BlogPosting':
            assert s.get('isPartOf',{}).get('@id')=='https://mabdelsamei.com/#website', f'{path}: BlogPosting not linked to WebSite'
            assert not s.get('headline','').endswith('Mohamed Abdelsamei'), f'{path}: BlogPosting headline carries site suffix'
    if canonical!='https://mabdelsamei.com/':
        assert p.title.endswith(' — Mohamed Abdelsamei'), f'{path}: title must end with " — Mohamed Abdelsamei"'
    # Case-study pages only; the /projects/ index is a CollectionPage with the site-wide preview.
    if '/projects/' in canonical and canonical!='https://mabdelsamei.com/projects/':
        types={s.get('@type') for s in p.schemas}
        assert {'SoftwareSourceCode','BreadcrumbList'}<=types, f'{path}: missing project schema'
        assert '/og/projects/' in p.meta['og:image'], f'{path}: generic project preview'
    count+=1
    # Markdown twin for agents: every post/project page links one, and it exists.
    if '/blog/' in canonical and canonical!='https://mabdelsamei.com/blog/' or '/projects/' in canonical and canonical!='https://mabdelsamei.com/projects/':
        md=canonical.rstrip('/')+'.md'
        assert p.alternates.get('text/markdown')==urlsplit(md).path, f'{path}: missing markdown alternate'
        assert (root/urlsplit(md).path.lstrip('/')).exists(), f'{path}: markdown twin not built'
# Agent index: llms.txt links every post/project twin, and every link resolves.
llms=(root/'llms.txt').read_text()
assert llms.startswith('# ') and '\n> ' in llms, 'llms.txt: missing title/summary'
for md in sorted(root.glob('blog/*.md'))+sorted(root.glob('projects/*.md')):
    assert f'https://mabdelsamei.com/{md.relative_to(root)}' in llms, f'llms.txt: missing {md.relative_to(root)}'
for link in re.findall(r'\]\((https://mabdelsamei\.com/[^)]*)\)', llms):
    target=urlsplit(link).path.lstrip('/')
    assert (root/target).exists() or (root/target/'index.html').exists(), f'llms.txt: broken link {link}'
full=(root/'llms-full.txt').read_text()
assert 'https://mabdelsamei.com/llms-full.txt' in llms and '## About' in llms and '## About' in full, 'llms.txt/llms-full.txt: missing About section'
for md in sorted(root.glob('blog/*.md'))+sorted(root.glob('projects/*.md')):
    text=md.read_text()
    body=text.split('\n\n',3)[-1]
    assert len(body)>500, f'{md}: twin has no real body'
    assert body.strip() in full, f'llms-full.txt: missing body of {md.relative_to(root)}'
    prose=re.sub(r'^(```|~~~).*?^(```|~~~)', '', text, flags=re.S|re.M)
    assert not re.search(r'^(import|export)\s', prose, re.M), f'{md}: MDX import/export leaked into twin'
    assert not re.search(r'<(?:[A-Z]|li>|span>|figure)', prose), f'{md}: raw HTML/JSX leaked into twin'
    assert not re.search(r'\]\(/(?!/)', prose), f'{md}: site-relative link left in twin'
print(f'Passed SEO checks for {count} pages: titles, descriptions, canonicals, social images, JSON-LD and sitemap inclusion.')
