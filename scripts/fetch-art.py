"""Resolve artwork URLs and metadata for every entry in the data lists.

- Films  (data/movies.txt) -> Wikipedia poster + Wikidata metadata -> data/posters.json
  (year, directors, runtime, genres)
- Albums (data/albums.txt) -> Deezer (iTunes fallback)             -> data/album-art.json
  (year, genre, length, tracks, label)
- Books  (data/books.txt)  -> Open Library                         -> data/book-art.json
  (year, pages, subjects)

Idempotent: entries already present in the cache files are skipped, so this
is cheap to run on every push (the deploy workflow does exactly that).
Run it locally after adding entries if you want the cache updated sooner.
"""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
UA = {'User-Agent': 'watchlist-art-fetch/1.0 (georgevassilakis2@gmail.com)'}

LINE_RE = re.compile(r'^- \[(?:x|0| )\] (.+)$', re.I)
RATING_RE = re.compile(r'(?:\s*[-–—:])?\s*\d+(?:\.\d+)?/10$')
# optional "(1995)" suffix disambiguates same-titled films; stripped from the
# displayed title, used to pick the right Wikipedia page
YEAR_HINT_RE = re.compile(r'\s*\((\d{4})\)$')


def get(url):
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=20))


def norm(s):
    # keep in sync with normalize() in src/lib/data.js
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', s.lower()).split())


def parse_movies():
    out = []
    for line in (DATA / 'movies.txt').read_text().splitlines():
        m = LINE_RE.match(line.strip())
        if not m:
            continue
        t = RATING_RE.sub('', m.group(1).strip()).strip()
        t = re.sub(r'\s*[-–—:]\s*$', '', t).strip()
        year = None
        h = YEAR_HINT_RE.search(t)
        if h:
            year = h.group(1)
            t = YEAR_HINT_RE.sub('', t).strip()
        if t and all(t != title for title, _ in out):
            out.append((t, year))
    return out


def parse_piped(name):
    out = []
    for line in (DATA / name).read_text().splitlines():
        m = LINE_RE.match(line.strip())
        if not m:
            continue
        parts = [p.strip() for p in m.group(1).split('|') if p.strip()]
        if parts and re.match(r'^\d+(?:\.\d+)?/10$', parts[-1]):
            parts.pop()
        parts = [p for p in parts if not re.match(r'^file:', p, re.I)]
        title, by = (parts + ['', ''])[:2]
        if title and (title, by) not in out:
            out.append((title, by))
    return out


def film_art(title, year=None):
    q = urllib.parse.quote(f'{title} {year} film' if year else f'{title} film')
    url = ('https://en.wikipedia.org/w/api.php?action=query&generator=search'
           f'&gsrsearch={q}&gsrlimit=5&prop=pageimages&piprop=thumbnail'
           '&pilicense=any&pithumbsize=640&format=json')
    pages = [p for p in get(url).get('query', {}).get('pages', {}).values()
             if (p.get('thumbnail') or {}).get('source')]
    pages.sort(key=lambda p: p.get('index', 99))
    if year:
        # prefer "(1988 film)"-style disambiguators, then "<title> (film)" pages,
        # then a bare exact title match
        base = lambda p: norm(re.sub(r'\s*\(.*\)$', '', p.get('title', '')))
        tagged = [p for p in pages if f'({year}' in p.get('title', '')]
        filmy_exact = [p for p in pages if 'film)' in p.get('title', '') and base(p) == norm(title)]
        exact = [p for p in pages if base(p) == norm(title)]
        pages = tagged or filmy_exact or exact or pages
    for p in pages:
        return {'page': p.get('title'), 'url': p['thumbnail']['source'].split('?')[0]}
    return None


def pick_album(results, title, artist, name_key, artist_key):
    nt, na = norm(title), norm(artist)
    candidates = [r for r in results if norm(artist_key(r)) == na]
    for r in candidates:
        if norm(name_key(r)) == nt:
            return r
    for r in candidates:
        n = norm(name_key(r))
        if n.startswith(nt) and 'single' not in n and 'karaoke' not in n:
            return r
    return None


def album_art(title, artist):
    q = urllib.parse.quote(f'{artist} {title}')
    r = pick_album(
        get(f'https://api.deezer.com/search/album?q={q}&limit=25').get('data', []),
        title, artist, lambda x: x['title'], lambda x: x['artist']['name'])
    if r:
        meta = {}
        try:
            full = get(f"https://api.deezer.com/album/{r['id']}")
            secs = full.get('duration') or 0
            meta = {
                'year': (full.get('release_date') or '')[:4] or None,
                'genre': ', '.join(g['name'] for g in full.get('genres', {}).get('data', [])[:2]) or None,
                'length': f'{secs // 60}:{secs % 60:02d}' if secs else None,
                'tracks': full.get('nb_tracks'),
                'label': full.get('label'),
            }
        except Exception:
            pass
        return {'source': f"deezer: {r['title']}", 'url': r['cover_xl'] or r['cover_big'],
                'meta': {k: v for k, v in meta.items() if v}}
    r = pick_album(
        get(f'https://itunes.apple.com/search?media=music&entity=album&term={q}&limit=25').get('results', []),
        title, artist, lambda x: x.get('collectionName', ''), lambda x: x.get('artistName', ''))
    if r:
        return {'source': f"itunes: {r['collectionName']}",
                'url': r['artworkUrl100'].replace('100x100bb', '600x600bb'),
                'meta': {k: v for k, v in {
                    'year': (r.get('releaseDate') or '')[:4] or None,
                    'genre': r.get('primaryGenreName'),
                    'tracks': r.get('trackCount'),
                }.items() if v}}
    return None


def book_art(title, author):
    t = urllib.parse.quote(title)
    a = urllib.parse.quote(author.split('&')[0].strip())
    url = (f'https://openlibrary.org/search.json?title={t}&author={a}'
           '&limit=5&fields=title,cover_i,first_publish_year,number_of_pages_median,subject')
    for r in get(url).get('docs', []):
        if r.get('cover_i'):
            return {'source': f"openlibrary: {r.get('title')}",
                    'url': f"https://covers.openlibrary.org/b/id/{r['cover_i']}-L.jpg",
                    'meta': {k: v for k, v in {
                        'year': r.get('first_publish_year'),
                        'pages': r.get('number_of_pages_median'),
                        'subjects': ', '.join((r.get('subject') or [])[:3]) or None,
                    }.items() if v}}
    return None


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def claim_values(entity, prop):
    out = []
    for c in entity.get('claims', {}).get(prop, []):
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        if v is not None:
            out.append(v)
    return out


def films_meta(cache):
    todo = {t: v for t, v in cache.items() if v and v.get('page') and 'meta' not in v}
    if not todo:
        return False
    print(f'posters.json: fetching metadata for {len(todo)} films')

    # wikipedia page -> wikidata entity id, batched
    qids = {}
    for batch in chunks(sorted({v['page'] for v in todo.values()}), 50):
        titles = urllib.parse.quote('|'.join(batch))
        d = get('https://en.wikipedia.org/w/api.php?action=query&redirects=1'
                f'&titles={titles}&prop=pageprops&ppprop=wikibase_item&format=json')
        renamed = {n['to']: n['from'] for n in d.get('query', {}).get('normalized', [])}
        for p in d.get('query', {}).get('pages', {}).values():
            q = p.get('pageprops', {}).get('wikibase_item')
            name = renamed.get(p.get('title'), p.get('title'))
            if q:
                qids[name] = q
        time.sleep(0.3)

    # entity claims, batched
    claims = {}
    for batch in chunks(sorted(set(qids.values())), 50):
        d = get('https://www.wikidata.org/w/api.php?action=wbgetentities'
                f"&ids={'|'.join(batch)}&props=claims&format=json")
        claims.update(d.get('entities', {}))
        time.sleep(0.3)

    # labels for directors and genres, batched
    label_ids = set()
    for e in claims.values():
        for prop in ('P57', 'P136'):
            label_ids.update(v['id'] for v in claim_values(e, prop)[:2] if isinstance(v, dict))
    labels = {}
    for batch in chunks(sorted(label_ids), 50):
        d = get('https://www.wikidata.org/w/api.php?action=wbgetentities'
                f"&ids={'|'.join(batch)}&props=labels&languages=en&format=json")
        for qid, e in d.get('entities', {}).items():
            labels[qid] = e.get('labels', {}).get('en', {}).get('value')
        time.sleep(0.3)

    for v in todo.values():
        e = claims.get(qids.get(v['page'], ''), {})
        years = [t['time'][1:5] for t in claim_values(e, 'P577') if isinstance(t, dict) and t.get('time')]
        runtimes = [a['amount'].lstrip('+') for a in claim_values(e, 'P2047') if isinstance(a, dict)]
        names = lambda prop: [labels.get(x['id']) for x in claim_values(e, prop)[:2]
                              if isinstance(x, dict) and labels.get(x['id'])]
        v['meta'] = {k: val for k, val in {
            'year': min(years) if years else None,
            'runtime': int(float(runtimes[0])) if runtimes else None,
            'directors': names('P57') or None,
            'genres': names('P136') or None,
        }.items() if val}
    return True


def refresh(cache_file, entries, fetch, describe):
    path = DATA / cache_file
    cache = json.loads(path.read_text()) if path.exists() else {}
    todo = [e for e in entries if describe(e) not in cache]
    if not todo:
        print(f'{cache_file}: up to date ({len(cache)} entries)')
        return
    print(f'{cache_file}: fetching {len(todo)} new entries')
    for e in todo:
        key = describe(e)
        try:
            cache[key] = fetch(e)
        except Exception as err:
            print(f'  ERROR {key}: {err}')
            continue  # leave out of the cache so the next run retries
        print(f'  {"ok  " if cache[key] else "MISS"} {key}')
        time.sleep(0.35)
    path.write_text(json.dumps(cache, indent=1, ensure_ascii=False) + '\n')


def main():
    refresh('posters.json', parse_movies(), lambda e: film_art(*e), lambda e: e[0])
    posters_path = DATA / 'posters.json'
    posters = json.loads(posters_path.read_text())
    if films_meta(posters):
        posters_path.write_text(json.dumps(posters, indent=1, ensure_ascii=False) + '\n')
    refresh('album-art.json', parse_piped('albums.txt'),
            lambda e: album_art(*e), lambda e: f'{norm(e[0])}::{norm(e[1])}')
    refresh('book-art.json', parse_piped('books.txt'),
            lambda e: book_art(*e), lambda e: f'{norm(e[0])}::{norm(e[1])}')


if __name__ == '__main__':
    main()
