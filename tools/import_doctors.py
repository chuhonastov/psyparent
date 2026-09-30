#!/usr/bin/env python3
"""Import the clinic's doctors from its website into webapp/src/content/clinic.json.

Best effort: finds doctor pages by link patterns, then reads schema.org JSON-LD
(Physician / Person), Open Graph tags and the page heading. Always review the
result by hand before committing: names, roles and photos are shown to parents.

Usage:  python3 tools/import_doctors.py [--site https://mind-clinic.ru/] [--dry-run]
"""
import argparse, datetime, html, json, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser

ROOT = __file__.rsplit('/tools/', 1)[0]
OUT = ROOT + '/webapp/src/content/clinic.json'
DOCTOR_LINK = re.compile(r'/(doctors?|vrach\w*|specialist\w*|team|komanda|sotrudnik\w*|experts?)/[^/?#]+/?$', re.I)
TRANSLIT = str.maketrans({'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'})

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'PsyParent-import/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode(r.headers.get_content_charset() or 'utf-8', 'replace')

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=set(); self.meta={}; self.jsonld=[]; self.h1=''; self._in=None; self._buf=''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'): self.links.add(a['href'])
        if tag == 'meta' and (a.get('property') or a.get('name')): self.meta[(a.get('property') or a.get('name')).lower()] = a.get('content') or ''
        if tag == 'script' and a.get('type') == 'application/ld+json': self._in, self._buf = 'ld', ''
        if tag == 'h1' and not self.h1: self._in, self._buf = 'h1', ''
    def handle_data(self, data):
        if self._in: self._buf += data
    def handle_endtag(self, tag):
        if self._in == 'ld' and tag == 'script':
            try: self.jsonld.append(json.loads(self._buf))
            except ValueError: pass
            self._in = None
        elif self._in == 'h1' and tag == 'h1':
            self.h1 = re.sub(r'\s+', ' ', self._buf).strip(); self._in = None

def parse(url):
    p = Page(); p.feed(fetch(url)); return p

def people(ld):
    stack = ld if isinstance(ld, list) else [ld]
    while stack:
        x = stack.pop()
        if isinstance(x, list): stack.extend(x); continue
        if not isinstance(x, dict): continue
        t = x.get('@type'); t = t if isinstance(t, list) else [t]
        if any(k in ('Physician', 'Person') for k in t): yield x
        stack.extend(v for v in x.values() if isinstance(v, (dict, list)))

def slug(name):
    s = name.lower().translate(TRANSLIT)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60] or 'doctor'

def doctor_from(url):
    p = parse(url)
    person = next((x for ld in p.jsonld for x in people(ld)), {})
    name = person.get('name') or p.h1 or p.meta.get('og:title', '')
    name = html.unescape(re.split(r'\s[|—–-]\s', name)[0]).strip()
    role = person.get('jobTitle') or person.get('medicalSpecialty') or ''
    if isinstance(role, list): role = ', '.join(map(str, role))
    about = person.get('description') or p.meta.get('og:description') or p.meta.get('description') or ''
    photo = person.get('image') or p.meta.get('og:image') or ''
    if isinstance(photo, dict): photo = photo.get('url', '')
    if isinstance(photo, list): photo = photo[0] if photo else ''
    photo = urllib.parse.urljoin(url, photo) if photo else ''
    d = {'id': slug(name), 'name': name, 'role': str(role).strip() or 'Врач клиники', 'about': html.unescape(about).strip(), 'profileUrl': url, 'bookingUrl': url}
    if photo.startswith('https://'): d['photo'] = photo
    return d

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--site', default='https://mind-clinic.ru/'); ap.add_argument('--dry-run', action='store_true'); args = ap.parse_args()
    home = parse(args.site)
    candidates = sorted({urllib.parse.urljoin(args.site, h) for h in home.links})
    listing = [u for u in candidates if re.search(r'/(doctors?|vrachi|specialist\w*|team|komanda)/?$', u, re.I)]
    for u in listing:
        try: candidates += [urllib.parse.urljoin(u, h) for h in parse(u).links]
        except Exception as e: print('skip listing', u, e, file=sys.stderr)
    host = urllib.parse.urlparse(args.site).netloc
    pages = sorted({u.split('#')[0] for u in candidates if urllib.parse.urlparse(u).netloc == host and DOCTOR_LINK.search(urllib.parse.urlparse(u).path)})
    doctors, seen = [], set()
    for u in pages:
        try: d = doctor_from(u)
        except Exception as e: print('skip', u, e, file=sys.stderr); continue
        if not d['name'] or d['id'] in seen: continue
        seen.add(d['id']); doctors.append(d)
    print(f'found {len(doctors)} doctor pages', file=sys.stderr)
    data = json.load(open(OUT))
    data.update({'site': args.site, 'doctors': doctors, 'updatedAt': datetime.date.today().isoformat()})
    out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if args.dry_run: print(out)
    else: open(OUT, 'w').write(out); print('written', OUT, file=sys.stderr)

if __name__ == '__main__':
    main()
