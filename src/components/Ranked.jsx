import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

const MEDAL = ['#F6C453', '#C8CCD2', '#C89B72']

export default function Ranked({ items, square = false, onItemClick }) {
  return (
    <ol className="flex flex-col">
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
            className={`flex items-center gap-3.5 border-b border-hairline py-2.5
              ${clickable ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`}
          >
            <span
              className="w-9 shrink-0 text-right text-lg font-extrabold tabular-nums tracking-tight"
              style={{ color: i < 3 ? MEDAL[i] : 'rgba(242,241,236,0.28)' }}
            >
              {i + 1}
            </span>
            <div className={`${square ? 'h-12 w-12' : 'h-14 w-10'} shrink-0 overflow-hidden rounded bg-card shadow shadow-black/40`}>
              {item.cover ? (
                <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: `hsl(${titleHue(item.title)} 20% 18%)` }}
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
