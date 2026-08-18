// Parse the plaintext lists (data/*.txt) into one unified shape per mode:
// sections: [{ year, items }] in file order (oldest section first, newest last)
// item: { title, subtitle, rating, done, cover, review }

// [x] done, [ ] queued, [0] currently in progress
const LINE_RE = /^- \[(x|0| )\] (.+)$/i
const RATING_RE = /(?:\s*[-–—:])?\s*(\d+(?:\.\d+)?)\/10$/

function parseMovieLine(line) {
  const m = line.match(LINE_RE)
  if (!m) return null
  let title = m[2].trim()
  let rating = null
  const r = title.match(RATING_RE)
  if (r) {
    rating = parseFloat(r[1])
    title = title.replace(RATING_RE, '').trim()
  } else {
    title = title.replace(/\s*[-–—:]\s*$/, '').trim()
  }
  // "(1995)" suffix is only a disambiguation hint for the art fetcher
  title = title.replace(/\s*\(\d{4}\)$/, '').trim()
  return {
    title,
    subtitle: '',
    rating,
    done: m[1].toLowerCase() === 'x',
    current: m[1] === '0',
    cover: null,
  }
}

function parsePipedLine(line, coverDir) {
  const m = line.match(LINE_RE)
  if (!m) return null
  const parts = m[2].split('|').map(p => p.trim()).filter(Boolean)
  let rating = null
  const last = parts[parts.length - 1]
  const r = last && last.match(/^(\d+(?:\.\d+)?)\/10$/)
  if (r) {
    rating = parseFloat(r[1])
    parts.pop()
  }
  const filePart = parts.find(p => /^file:/i.test(p))
  const cover = filePart ? `data/${coverDir}/${filePart.replace(/^file:\s*/i, '').trim()}` : null
  const [title = '', by = '', year = ''] = parts
  return {
    title,
    by,
    year,
    subtitle: [by, year].filter(Boolean).join(' · '),
    rating,
    done: m[1].toLowerCase() === 'x',
    current: m[1] === '0',
    cover,
  }
}

function parseSections(text, parseLine) {
  const sections = []
  let current = { year: null, items: [] }
  const push = () => {
    if (current.items.length > 0 || current.year !== null) sections.push(current)
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const y = line.match(/^##\s*(\d{4})\s*$/)
    if (y) {
      push()
      current = { year: y[1], items: [] }
      continue
    }
    const item = parseLine(line)
    if (item) current.items.push(item)
  }
  push()
  return sections
}

async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.text()
}

async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: 'no-cache' })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

// keep in sync with norm() in scripts/fetch-art.py
const normalize = s =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export async function loadAll() {
  const [moviesTxt, booksTxt, albumsTxt, posters, albumArt, bookArt, reviews] = await Promise.all([
    fetchText('data/movies.txt'),
    fetchText('data/books.txt'),
    fetchText('data/albums.txt'),
    fetchJson('data/posters.json', {}),
    fetchJson('data/album-art.json', {}),
    fetchJson('data/book-art.json', {}),
    fetchJson('data/album-reviews.json', []),
  ])

  const movieSections = parseSections(moviesTxt, parseMovieLine)
  for (const s of movieSections) {
    for (const item of s.items) {
      item.logged = s.year
      const p = posters[item.title]
      if (p && p.url) item.cover = p.url
      const meta = p?.meta ?? {}
      item.meta = meta
      item.subtitle =
        [meta.year, meta.directors?.[0], meta.runtime && `${meta.runtime} min`]
          .filter(Boolean)
          .join(' · ') || (s.year ? `Logged ${s.year}` : '')
    }
  }

  const bookSections = parseSections(booksTxt, l => parsePipedLine(l, 'covers'))
  const albumSections = parseSections(albumsTxt, l => parsePipedLine(l, 'albums'))

  // fetched art wins; a local file: entry is the manual override/fallback
  const artKey = i => `${normalize(i.title)}::${normalize(i.by)}`
  const apply = (sections, art) => {
    for (const s of sections) {
      for (const i of s.items) {
        i.logged = s.year
        const a = art[artKey(i)]
        i.cover = a?.url ?? i.cover
        i.meta = a?.meta ?? {}
        i.year = i.year || i.meta.year || ''
        i.subtitle = [i.by, i.year].filter(Boolean).join(' · ')
      }
    }
  }
  apply(bookSections, bookArt)
  apply(albumSections, albumArt)

  const reviewMap = new Map()
  for (const r of Array.isArray(reviews) ? reviews : []) {
    reviewMap.set(`${normalize(r.title)}::${normalize(r.artist)}`, r)
  }
  for (const s of albumSections) {
    for (const item of s.items) {
      if (!item.done) continue
      item.review = reviewMap.get(`${normalize(item.title)}::${normalize(item.by)}`) || null
    }
  }

  return {
    films: { sections: movieSections },
    books: { sections: bookSections },
    music: { sections: albumSections },
  }
}

export function allItems(sections) {
  return sections.flatMap(s => s.items)
}

// theme-aware print inks, defined per data-theme in index.css
export function ratingColor(r) {
  if (r == null) return 'var(--mc-r-null)'
  if (r >= 9.5) return 'var(--mc-r-95)'
  if (r >= 9.0) return 'var(--mc-r-9)'
  if (r >= 8.0) return 'var(--mc-r-8)'
  if (r >= 7.0) return 'var(--mc-r-7)'
  if (r >= 6.0) return 'var(--mc-r-6)'
  return 'var(--mc-r-low)'
}

export function formatRating(r) {
  const n = Number(r)
  return Number.isNaN(n) ? '' : n.toFixed(1)
}

// deterministic fallback hue per title, for films with no poster art
export function titleHue(title) {
  let h = 0
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
