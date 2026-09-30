#!/usr/bin/env python3
"""Import the clinic's child and adolescent specialists into webapp/src/content/clinic.json.

The site mind-clinic.ru is a Nuxt app backed by a public Strapi API. The script
finds the API address in the site's HTML, downloads all doctors, keeps those who
see patients younger than 18 (no trainees, no staff roles, no paused schedules),
saves their small photos to webapp/public/doctors/ and writes clinic.json.
Review the diff by hand before committing: this text is shown to parents.

Usage:  python3 tools/import_doctors.py [--site https://mind-clinic.ru/] [--dry-run]
"""
import argparse, datetime, html, json, pathlib, re, sys, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'webapp/src/content/clinic.json'
PHOTOS = ROOT / 'webapp/public/doctors'
SKIP_ROLES = re.compile(r'стаж[её]р|администратор|оператор|директор|руководител|служб', re.I)
PAUSED = re.compile(r'приостановлен|только повторных', re.I)

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'PsyParent-import/2.0'})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read()
        return data if binary else data.decode(r.headers.get_content_charset() or 'utf-8', 'replace')

def text(value):
    s = re.sub(r'<br\s*/?>|</p>|</div>', '\n', value or '', flags=re.I)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    s = re.sub(r'[ \t\r\f\v]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n\n', '\n'.join(line.strip() for line in s.split('\n'))).strip()

def num(v):
    try: return float(str(v).replace(',', '.'))
    except (TypeError, ValueError): return None

def ages(a, b):
    fmt = lambda x: ('%g' % x).replace('.', ',')
    if a is None: return ''
    if b and b >= 90: b = None
    if not a and not b: return 'Пациенты любого возраста'
    if not a: return f'Пациенты до {fmt(b)} лет'
    if b and b <= 18: return f'Дети от {fmt(a)} до {fmt(b)} лет'
    if b: return f'Пациенты от {fmt(a)} до {fmt(b)} лет'
    return f'Пациенты от {fmt(a)} лет'

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')

def city(address):
    return 'Москва' if 'Москва' in address else 'Санкт-Петербург' if 'Петербург' in address else ''

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--site', default='https://mind-clinic.ru/'); ap.add_argument('--dry-run', action='store_true'); args = ap.parse_args()
    home = get(args.site)
    m = re.search(r'https://[a-z0-9.-]+/api/', home)
    if not m: sys.exit('API address not found on the site')
    api = m.group(0); cms = api[:-len('api/')]
    rows, page = [], 1
    while True:
        q = urllib.parse.urlencode({'populate': '*', 'pagination[page]': page, 'pagination[pageSize]': 50})
        data = json.loads(get(api + 'docs?' + q))
        rows += data['data']
        if page >= data['meta']['pagination']['pageCount']: break
        page += 1
    branches = {}
    doctors = []
    for row in sorted(rows, key=lambda r: int(r['attributes'].get('sort') or 0)):
        a = row['attributes']
        role = re.sub(r'\s+', ' ', a.get('special') or '').strip()
        start, end = num(a.get('age_from')), num(a.get('age_to'))
        note = text(a.get('app_info'))
        if not a.get('url') or start is None or start >= 18 or SKIP_ROLES.search(role) or PAUSED.search(note + ' ' + text(a.get('special_long'))):
            continue
        ids = []
        for c in a['clinics']['data']:
            ca = c['attributes']; bid = slug(ca.get('slug') or str(c['id'])) or str(c['id'])
            raw = re.sub(r'\s+', ' ', ca.get('address') or '').strip()
            address = re.sub(r'^(\d{6},\s*)?(гор\.|г\.)\s*(Санкт-Петербург|Москва),?\s*', '', raw)
            branches[bid] = {'id': bid, 'title': ca['title'], 'city': city(raw), 'address': address, 'phone': ca.get('phone') or ''}
            ids.append(bid)
        doc_id = slug(a['url']) or 'doctor-' + str(row['id'])
        d = {'id': doc_id, 'name': ' '.join(x.strip() for x in [a.get('lname'), a.get('fname'), a.get('pname')] if x and x.strip()),
             'role': role, 'ages': ages(start, end), 'ageFrom': start, 'ageTo': end,
             'online': bool(a.get('online')), 'branches': ids,
             'specialties': [s['attributes']['title'] for s in a['specials']['data']],
             'about': text(a.get('about')), 'profileUrl': urllib.parse.urljoin(args.site, 'docs/' + urllib.parse.quote(a['url']))}
        if end is None or end >= 90: d.pop('ageTo')
        if note: d['bookingNote'] = note
        if re.search(r'сомнолог', role, re.I): d['topics'] = ['sleep_disorders']
        photo = (a.get('photo_mini') or {}).get('data') or (a.get('photo') or {}).get('data')
        if photo:
            f = photo['attributes']; small = (f.get('formats') or {}).get('small') or f
            ext = pathlib.Path(small['url']).suffix or '.webp'
            if not args.dry_run:
                PHOTOS.mkdir(parents=True, exist_ok=True)
                (PHOTOS / (doc_id + ext)).write_bytes(get(urllib.parse.urljoin(cms, small['url']), binary=True))
            d['photo'] = 'doctors/' + doc_id + ext
        doctors.append(d)
    rank = lambda d: 0 if re.search(r'детск', d['role'], re.I) else 1 if re.search(r'подростк', d['role'], re.I) else 2 if re.search(r'психиатр|психотерапевт', d['role'], re.I) else 3
    doctors.sort(key=rank)
    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    data.update({'name': 'Open Mind Clinic', 'site': args.site, 'bookingUrl': args.site, 'branches': sorted(branches.values(), key=lambda b: (b['city'] != 'Санкт-Петербург', b['title'])), 'doctors': doctors, 'updatedAt': datetime.date.today().isoformat()})
    out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    print(f'{len(doctors)} child and adolescent specialists, {len(branches)} branches', file=sys.stderr)
    if args.dry_run: print(out)
    else: OUT.write_text(out)

if __name__ == '__main__':
    main()
