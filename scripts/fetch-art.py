"""Resolve artwork URLs for every entry in the data lists.

- Films  (data/movies.txt) -> Wikipedia poster    -> data/posters.json
- Albums (data/albums.txt) -> Deezer, then iTunes -> data/album-art.json
- Books  (data/books.txt)  -> Open Library        -> data/book-art.json

Idempotent: titles already present in the cache files are skipped, so this
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

LINE_RE = re.compile(r'^- \[(?:x| )\] (.+)$', re.I)
RATING_RE = re.compile(r'(?:\s*[-–—:])?\s*\d+(?:\.\d+)?/10$')


def get(url):
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=20))


def norm(s):
    return ''.join(c for c in s.lower() if c.isalnum() or c == ' ').strip()


def parse_movies():
    out = []
    for line in (DATA / 'movies.txt').read_text().splitlines():
        m = LINE_RE.match(line.strip())
        if not m:
            continue
        t = RATING_RE.sub('', m.group(1).strip()).strip()
        t = re.sub(r'\s*[-–—:]\s*$', '', t).strip()
        if t and t not in out:
            out.append(t)
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


def film_art(title):
    q = urllib.parse.quote(f'{title} film')
    url = ('https://en.wikipedia.org/w/api.php?action=query&generator=search'
           f'&gsrsearch={q}&gsrlimit=1&prop=pageimages&piprop=thumbnail'
           '&pilicense=any&pithumbsize=640&format=json')
    for p in get(url).get('query', {}).get('pages', {}).values():
        t = p.get('thumbnail') or {}
        if t.get('source'):
            return {'page': p.get('title'), 'url': t['source'].split('?')[0]}
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
        return {'source': f"deezer: {r['title']}", 'url': r['cover_xl'] or r['cover_big']}
    r = pick_album(
        get(f'https://itunes.apple.com/search?media=music&entity=album&term={q}&limit=25').get('results', []),
        title, artist, lambda x: x.get('collectionName', ''), lambda x: x.get('artistName', ''))
    if r:
        return {'source': f"itunes: {r['collectionName']}",
                'url': r['artworkUrl100'].replace('100x100bb', '600x600bb')}
    return None


def book_art(title, author):
    t = urllib.parse.quote(title)
    a = urllib.parse.quote(author.split('&')[0].strip())
    url = (f'https://openlibrary.org/search.json?title={t}&author={a}'
           '&limit=5&fields=title,cover_i')
    for r in get(url).get('docs', []):
        if r.get('cover_i'):
            return {'source': f"openlibrary: {r.get('title')}",
                    'url': f"https://covers.openlibrary.org/b/id/{r['cover_i']}-L.jpg"}
    return None


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
    refresh('posters.json', parse_movies(), film_art, lambda t: t)
    refresh('album-art.json', parse_piped('albums.txt'),
            lambda e: album_art(*e), lambda e: f'{norm(e[0])}::{norm(e[1])}')
    refresh('book-art.json', parse_piped('books.txt'),
            lambda e: book_art(*e), lambda e: f'{norm(e[0])}::{norm(e[1])}')


if __name__ == '__main__':
    main()
