"""Generate project social PNGs from shared tokens and project frontmatter.
Usage: python3 scripts/generate-social-cards.py --browser /path/to/chrome-headless-shell
"""
import argparse
import html
from pathlib import Path
import subprocess
import tempfile
parser=argparse.ArgumentParser()
parser.add_argument('--browser',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
output=root/'public/og/projects'
output.mkdir(parents=True,exist_ok=True)
for source in sorted((root/'src/content/projects').glob('*.md')):
    fields={}
    for line in source.read_text().split('---',2)[1].splitlines():
        if ':' in line:
            key,value=line.split(':',1);fields[key.strip()]=value.strip().strip('"')
    title=html.escape(fields['cardTitle'])
    subtitle=html.escape(fields['cardSubtitle'])
    category=html.escape(fields['category'])
    tokens=(root/'src/styles/tokens.css').as_uri()
    document=f'''<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="{tokens}"><style>
*{{box-sizing:border-box}}body{{margin:0;width:1200px;height:630px;background:var(--bg);color:var(--head);font-family:var(--sans);padding:64px;display:flex;flex-direction:column}}header{{display:flex;justify-content:space-between;align-items:center;font-size:20px;color:var(--dim)}}.logo{{font-size:40px;font-weight:700;letter-spacing:-2px;color:var(--head)}}.logo span{{display:inline-block;width:20px;height:6px;background:var(--accent);margin-left:4px}}main{{flex:1;display:flex;flex-direction:column;justify-content:center}}h1{{font-size:84px;line-height:1.1;letter-spacing:-4px;margin:0;max-width:1050px}}p{{font-size:34px;line-height:1.5;color:var(--dim);margin:24px 0 0}}footer{{border-top:1px solid var(--hair2);padding-top:24px;display:flex;justify-content:space-between;font-size:21px;color:var(--dim)}}.category{{text-transform:uppercase;letter-spacing:2px;font-size:16px}}</style><body><header><div class="logo">ma<span></span></div><div class="category">{category}</div></header><main><h1>{title}<span style="color:var(--accent)">.</span></h1><p>{subtitle}</p></main><footer><span>Mohamed Abdelsamei</span><span>mabdelsamei.com</span></footer></body></html>'''
    with tempfile.TemporaryDirectory(prefix='portfolio-social-') as directory:
        page=Path(directory)/'card.html';page.write_text(document)
        subprocess.run([args.browser,'--disable-gpu','--hide-scrollbars','--allow-file-access-from-files', '--window-size=1200,630','--timeout=8000',f'--screenshot={output/source.with_suffix(".png").name}',page.as_uri()],check=True,capture_output=True)
    print(f'Generated {source.stem}: 1200 × 630')
