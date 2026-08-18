import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

export default function Ranked({ items, square = false, onItemClick }) {
  return (
    <ol className="flex flex-col border-t-[3px] border-ink">
      {items.map((item, i) => {
        const clickable = Boolean(onItemClick)
        return (
          <motion.li
            key={`${item.title}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.35, delay: (i % 10) * 0.02 }}
            onClick={clickable ? () => onItemClick(item) : undefined}
            className={`flex items-center gap-3.5 border-b border-line py-2.5
              ${clickable ? 'cursor-pointer hover:bg-paper' : ''}`}
          >
            <span
              className={`w-9 shrink-0 text-right text-lg font-extrabold tabular-nums tracking-tight ${
                i < 3 ? 'text-accent' : 'text-dim/60'
              }`}
            >
              {i + 1}
            </span>
            <div className={`${square ? 'h-12 w-12' : 'h-14 w-10'} shrink-0 overflow-hidden bg-paper shadow-print`}>
              {item.cover ? (
                <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{item.title}</div>
              {item.subtitle && <div className="truncate text-xs text-dim">{item.subtitle}</div>}
            </div>
            <span className="text-[15px] font-bold" style={{ color: ratingColor(item.rating) }}>
              {formatRating(item.rating)}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
