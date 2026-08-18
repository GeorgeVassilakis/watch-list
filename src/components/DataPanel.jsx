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
                <span className="text-[11px] font-bold text-ground">{r.count}</span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function DataPanel({ items, extraChart, square = false, onItemClick }) {
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

      <Histogram title="Rating distribution" rows={bands} />
      {extraChart && <Histogram title={extraChart.title} rows={extraChart.rows} color="var(--mc-dim)" />}
    </div>
  )
}
