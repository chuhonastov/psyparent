#!/usr/bin/env python3
"""Create a self-contained browser preview from the Vite production build."""
from pathlib import Path
import re
import base64

root = Path(__file__).resolve().parents[1]
dist = root / 'webapp' / 'dist'
html = (dist / 'index.html').read_text(encoding='utf-8')
script = re.search(r'<script[^>]+src="([^"]+)"[^>]*></script>', html)
style = re.search(r'<link[^>]+href="([^"]+\.css)"[^>]*>', html)
if not script or not style:
    raise SystemExit('Build entries not found. Run npm run build in webapp first.')
js = (dist / script.group(1).lstrip('/')).read_text(encoding='utf-8')
css = (dist / style.group(1).lstrip('/')).read_text(encoding='utf-8')
js = re.sub(r'</script', r'<\\/script', js, flags=re.IGNORECASE)
# The bundled Literata font is referenced as /assets/*.woff2; embed it so the preview needs no files next to it.
def inline_font(match):
    font = dist / match.group(1).lstrip('/')
    return 'url(data:font/woff2;base64,' + base64.b64encode(font.read_bytes()).decode('ascii') + ')'
css = re.sub(r'url\((/assets/[^)]+\.woff2)\)', inline_font, css)
pdf = root / 'webapp/public/forms/YGTSS-R-2017-RU-working.pdf'
if pdf.exists():
    pdf_url = 'data:application/pdf;base64,' + base64.b64encode(pdf.read_bytes()).decode('ascii')
    html = html.replace('</head>', '<script>window.__PSYPARENT_CLINICAL_PDF__=' + repr(pdf_url) + ';</script></head>')
html = html.replace(script.group(0), '<script>window.__PSYPARENT_OFFLINE__=true;</script>\n<script type="module">' + js + '</script>')
html = html.replace(style.group(0), '<style>' + css + '</style>')
output = root / 'PsyParent-preview.html'
output.write_text(html, encoding='utf-8')
print(f'Preview: {output} ({output.stat().st_size:,} bytes)')
