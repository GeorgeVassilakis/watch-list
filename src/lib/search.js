// Search across every list. Matching ignores case, accents and punctuation,
// so "etranger" finds "L'Étranger" and "spiderman" finds "Spider-Man".
import { allItems } from './data.js'

// below this length a query only matches at word starts, so "man" does not
// drag in every title that merely contains it ("Romance", "Batman")
const MIN_INFIX = 4

// Lowercase, strip accents and collapse every run of non letters/digits into
// one space. `from[k]` is the [start, end) span in `s` that folded char k came
// from, so matches can be mapped back onto the original text.
function foldMap(s) {
  let text = ''
  const from = []
  let i = 0
  for (const ch of String(s ?? '')) {
    const span = [i, i + ch.length]
    for (const c of ch.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')) {
      const piece = /[\p{L}\p{N}]/u.test(c) ? c : text && !text.endsWith(' ') ? ' ' : ''
      text += piece
      for (let k = 0; k < piece.length; k++) from.push(span)
    }
    i += ch.length
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1)
    from.pop()
  }
  return { text, from }
}

export const fold = s => foldMap(s).text

function entry(mode, item, order) {
  const title = fold(item.title)
  const people = mode === 'films' ? item.meta?.directors ?? [] : [item.by]
  const genres = [item.meta?.genres, item.meta?.genre, item.review?.metadata?.genre].flat()
  const rest = fold([...people, item.year || item.meta?.year, ...genres].filter(Boolean).join(' '))
  return {
    id: `${mode}:${order}`,
    mode,
    item,
    order,
    title,
    compact: title.replaceAll(' ', ''),
    titleWords: ` ${title}`,
    allWords: ` ${title} ${rest}`,
  }
}

export function buildIndex(data, modes) {
  return modes.flatMap(m => allItems(data[m.id].sections).map((item, i) => entry(m.id, item, i)))
}

function score(e, q) {
  if (e.title === q.text) return 100
  if (e.title.startsWith(q.text)) return 90
  if (q.tokens.every(t => e.titleWords.includes(` ${t}`))) return 70
  if (q.compact.length >= MIN_INFIX && e.compact.includes(q.compact)) {
    return e.compact.startsWith(q.compact) ? 60 : 40
  }
  if (q.tokens.every(t => e.allWords.includes(` ${t}`))) return 20
  return 0
}

function parseQuery(query) {
  const text = fold(query)
  return { text, tokens: text.split(' '), compact: text.replaceAll(' ', '') }
}

// best match first; ties go to the most recent entry (lists are oldest-first)
export function search(index, query) {
  const q = parseQuery(query)
  if (!q.text) return []
  return index
    .map(e => ({ e, s: score(e, q) }))
    .filter(r => r.s > 0)
    .sort((a, b) => b.s - a.s || b.e.order - a.e.order)
    .map(r => r.e)
}

// Split `text` into [{ text, hit }] segments, marking each query word where it
// starts a word, or failing that the squashed query as one run.
export function highlight(text, query) {
  const q = parseQuery(query)
  const { text: f, from } = foldMap(text)
  const spans = []
  if (q.text) {
    for (const t of q.tokens) {
      for (let at = f.indexOf(t); at !== -1; at = f.indexOf(t, at + 1)) {
        if (at === 0 || f[at - 1] === ' ') spans.push([at, at + t.length])
      }
    }
  }
  if (!spans.length && q.compact.length >= MIN_INFIX) {
    const kept = [...f].flatMap((c, k) => (c === ' ' ? [] : [k]))
    const at = kept.map(k => f[k]).join('').indexOf(q.compact)
    if (at !== -1) spans.push([kept[at], kept[at + q.compact.length - 1] + 1])
  }

  const ranges = spans
    .map(([a, b]) => [from[a][0], from[b - 1][1]])
    .sort((x, y) => x[0] - y[0])
    .reduce((out, r) => {
      const last = out[out.length - 1]
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
      else out.push(r)
      return out
    }, [])

  const segments = []
  let pos = 0
  for (const [a, b] of ranges) {
    if (a > pos) segments.push({ text: text.slice(pos, a), hit: false })
    segments.push({ text: text.slice(a, b), hit: true })
    pos = b
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hit: false })
  return segments
}
