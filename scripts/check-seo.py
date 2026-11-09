"""Check generated SEO metadata locally; no search-engine or network calls."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
import struct
import xml.etree.ElementTree as ET
root=Path('dist')
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.meta={};self.canonical=[];self.title='';self.in_title=False;self.in_schema=False;self.schema_text='';self.schemas=[]
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t=='meta': self.meta[a.get('name') or a.get('property')]=a.get('content','')
        if t=='link' and a.get('rel')=='canonical': self.canonical.append(a['href'])
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
    p=Page();p.feed(path.read_text())
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
    if canonical=='https://mabdelsamei.com/':
        assert any(s.get('@type')=='WebSite' and s.get('name')=='Mohamed Abdelsamei' for s in p.schemas), 'Homepage missing branded WebSite schema'
    if '/projects/' in canonical:
        types={s.get('@type') for s in p.schemas}
        assert {'SoftwareSourceCode','BreadcrumbList'}<=types, f'{path}: missing project schema'
        assert '/og/projects/' in p.meta['og:image'], f'{path}: generic project preview'
    count+=1
print(f'Passed SEO checks for {count} pages: titles, descriptions, canonicals, social images, JSON-LD and sitemap inclusion.')
