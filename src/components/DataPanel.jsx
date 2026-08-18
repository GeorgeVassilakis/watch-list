import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

function Histogram({ title, rows, color }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-dim">{title}</h3>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-dim">
              {r.label}
            </span>
            <div className="h-6 flex-1 overflow-hidden bg-paper">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(r.count / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="flex h-full min-w-7 items-center justify-end px-2"
                style={{ background: r.color ?? color }}
              >
                <span className="text-[11px] font-bold text-ground">{r.count.toLocaleString()}</span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Tiles({ tiles }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
      {tiles.map(t => (
        <div key={t.label} className="border-t-[3px] border-ink pt-2">
          <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.value}</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
            {t.label}
          </div>
          {t.detail && <div className="mt-0.5 truncate text-xs text-dim">{t.detail}</div>}
        </div>
      ))}
    </div>
  )
}

// release-year decades of everything finished
function decadeChart(items) {
  const counts = new Map()
  for (const item of items.filter(i => i.done)) {
    const m = String(item.meta?.year ?? item.year ?? '').match(/(\d{4})/)
    if (!m) continue
    const decade = Math.floor(Number(m[1]) / 10) * 10
    const label = decade <= 1950 ? '1950s & earlier' : `${decade}s`
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  const rows = [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, count]) => ({ label, count }))
  return rows.length ? rows : null
}

// directors seen at least twice, by film count then average rating
function directorBoard(items) {
  const by = new Map()
  for (const i of items.filter(i => i.done)) {
    for (const d of i.meta?.directors ?? []) {
      const e = by.get(d) ?? { films: 0, sum: 0, rated: 0 }
      e.films += 1
      if (i.rating != null) {
        e.sum += i.rating
        e.rated += 1
      }
      by.set(d, e)
    }
  }
  return [...by.entries()]
    .filter(([, e]) => e.films >= 2)
    .map(([name, e]) => ({ name, films: e.films, avg: e.rated ? e.sum / e.rated : null }))
    .sort((a, b) => b.films - a.films || (b.avg ?? 0) - (a.avg ?? 0))
    .slice(0, 8)
}

function filmTiles(items) {
  const done = items.filter(i => i.done)
  const timed = done.filter(i => i.meta?.runtime)
  const tiles = []

  if (timed.length) {
    const totalMin = timed.reduce((s, i) => s + Number(i.meta.runtime), 0)
    const days = Math.floor(totalMin / 1440)
    const hours = Math.round((totalMin % 1440) / 60)
    const longest = timed.reduce((a, b) => (Number(b.meta.runtime) > Number(a.meta.runtime) ? b : a))
    const shortest = timed.reduce((a, b) => (Number(b.meta.runtime) < Number(a.meta.runtime) ? b : a))
    tiles.push(
      { value: `${days}d ${hours}h`, label: 'In the dark' },
      { value: `${longest.meta.runtime} min`, label: 'Longest', detail: longest.title },
      { value: `${shortest.meta.runtime} min`, label: 'Shortest', detail: shortest.title },
    )
  }

  const ages = done
    .filter(i => i.meta?.year && i.logged)
    .map(i => Number(i.logged) - Number(i.meta.year))
    .filter(a => a >= 0)
    .sort((a, b) => a - b)
  if (ages.length) {
    const median = ages[Math.floor(ages.length / 2)]
    const newShare = Math.round((ages.filter(a => a === 0).length / ages.length) * 100)
    tiles.push(
      { value: `${median} yrs`, label: 'Median film age' },
      { value: `${newShare}%`, label: 'Seen in release year' },
    )
  }

  return tiles
}

function bookTiles(items) {
  const paged = items.filter(i => i.done && i.meta?.pages)
  if (!paged.length) return []
  const total = paged.reduce((s, i) => s + Number(i.meta.pages), 0)
  return [{ value: total.toLocaleString(), label: 'Pages read' }]
}

export default function DataPanel({ items, mode, onItemClick }) {
  const square = mode === 'music'
  const rated = items.filter(i => i.done && i.rating != null)

  const bands = [
    { label: '9.0 +', test: r => r >= 9 },
    { label: '8.0 – 8.9', test: r => r >= 8 && r < 9 },
    { label: '7.0 – 7.9', test: r => r >= 7 && r < 8 },
    { label: '6.0 – 6.9', test: r => r >= 6 && r < 7 },
    { label: 'below 6', test: r => r < 6 },
  ].map(b => ({
    label: b.label,
    count: rated.filter(i => b.test(i.rating)).length,
    color: ratingColor(b.label === 'below 6' ? 5 : parseFloat(b.label)),
  }))

  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 10)

  const tiles = mode === 'films' ? filmTiles(items) : mode === 'books' ? bookTiles(items) : []
  const directors = mode === 'films' ? directorBoard(items) : []
  const decades = mode === 'films' || mode === 'music' ? decadeChart(items) : null

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-dim">
          Top ten
        </h3>
        {/* posters slide out under a fade at each edge instead of hard-clipping */}
        <div
          className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 after:block after:w-2 after:shrink-0 after:content-['']"
          style={{
            maskImage:
              'linear-gradient(90deg, transparent, black 20px, black calc(100% - 20px), transparent)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent, black 20px, black calc(100% - 20px), transparent)',
          }}
        >
          {top.map((item, i) => (
            <div
              key={item.title}
              className={`w-28 shrink-0 snap-start ${onItemClick ? 'cursor-pointer' : ''}`}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            >
              <div className={`relative ${square ? 'aspect-square' : 'aspect-[2/3]'} overflow-hidden bg-paper shadow-print`}>
                {item.cover ? (
                  <img src={item.cover} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full items-end p-2"
                    style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
                  >
                    <span className="text-xs font-semibold text-[#F2ECDF]">{item.title}</span>
                  </div>
                )}
                <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center bg-accent text-xs font-extrabold text-ground">
                  {i + 1}
                </span>
              </div>
              <div className="mt-1.5 truncate text-xs font-medium text-dim">{item.title}</div>
              <div className="text-xs font-bold" style={{ color: ratingColor(item.rating) }}>
                {formatRating(item.rating)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {tiles.length > 0 && <Tiles tiles={tiles} />}

      {directors.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-dim">
            Most watched directors
          </h3>
          <ol className="flex flex-col border-t-[3px] border-ink">
            {directors.map((d, i) => (
              <li key={d.name} className="flex items-baseline gap-3 border-b border-line py-2">
                <span
                  className={`w-6 shrink-0 text-right text-[15px] font-extrabold tabular-nums ${
                    i < 3 ? 'text-accent' : 'text-dim/60'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{d.name}</span>
                <span className="text-xs text-dim">{d.films} films</span>
                {d.avg != null && (
                  <span className="w-8 text-right text-[15px] font-bold" style={{ color: ratingColor(d.avg) }}>
                    {formatRating(d.avg)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Histogram title="Rating distribution" rows={bands} />
      {decades && <Histogram title="Decade distribution" rows={decades} color="var(--mc-dim)" />}
    </div>
  )
}
