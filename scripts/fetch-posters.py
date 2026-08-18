"""Fetch movie poster URLs from Wikipedia for every title in data/movies.txt.

Writes data/posters.json mapping the exact title string from movies.txt to
{page, url, width, height}. Idempotent: already-resolved titles are skipped,
so rerun it after adding new films.
"""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOVIES = ROOT / 'data' / 'movies.txt'
OUT = ROOT / 'data' / 'posters.json'
UA = {'User-Agent': 'watchlist-poster-fetch/1.0 (georgevassilakis2@gmail.com)'}

def titles():
    seen = []
    for line in MOVIES.read_text().splitlines():
        m = re.match(r'^- \[(?:x| )\] (.+)$', line.strip(), re.I)
        if not m:
            continue
        t = m.group(1).strip()
        t = re.sub(r'(?:\s*[-–—:])?\s*\d+(?:\.\d+)?/10$', '', t).strip()
        t = re.sub(r'\s*[-–—:]\s*$', '', t).strip()
        if t and t not in seen:
            seen.append(t)
    return seen

def lookup(title):
    q = urllib.parse.quote(f'{title} film')
    url = ('https://en.wikipedia.org/w/api.php?action=query&generator=search'
           f'&gsrsearch={q}&gsrlimit=1&prop=pageimages&piprop=thumbnail'
           '&pilicense=any&pithumbsize=640&format=json')
    req = urllib.request.Request(url, headers=UA)
    d = json.load(urllib.request.urlopen(req, timeout=20))
    for p in d.get('query', {}).get('pages', {}).values():
        t = p.get('thumbnail') or {}
        if t.get('source'):
            return {
                'page': p.get('title'),
                'url': t['source'].split('?')[0],
                'width': t.get('width'),
                'height': t.get('height'),
            }
    return None

def main():
    existing = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [t for t in titles() if t not in existing]
    print(f'{len(todo)} titles to fetch ({len(existing)} cached)')
    for i, t in enumerate(todo, 1):
        try:
            existing[t] = lookup(t)
        except Exception as e:
            print(f'  ERROR {t}: {e}')
            existing[t] = None
        if i % 20 == 0:
            print(f'  {i}/{len(todo)}')
            OUT.write_text(json.dumps(existing, indent=1, ensure_ascii=False))
        time.sleep(0.35)
    OUT.write_text(json.dumps(existing, indent=1, ensure_ascii=False))
    misses = [t for t, v in existing.items() if not v]
    print(f'done: {len(existing) - len(misses)} found, {len(misses)} missing')
    for t in misses:
        print(f'  MISS: {t}')

if __name__ == '__main__':
    main()
