import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

export default function PosterCard({ item, index = 0, square = false, mark = null, onClick }) {
  const clickable = Boolean(onClick)
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.03, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? item.title : undefined}
      onKeyDown={clickable ? e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
      className={clickable ? 'cursor-pointer' : ''}
    >
    <div
      className={`relative ${square ? 'aspect-square' : 'aspect-[2/3]'} overflow-hidden bg-paper shadow-print`}
    >
      {item.cover ? (
        <img
          src={item.cover}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-end p-2.5"
          style={{ background: `hsl(${titleHue(item.title)} 30% 30%)` }}
        >
          <span className="text-[13px] font-semibold leading-snug text-[#F2ECDF]">
            {item.title}
          </span>
        </div>
      )}

      {item.current && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-2 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-2" />
        </span>
      )}

      {item.rating != null && (
        <span
          className="absolute bottom-0 left-0 px-1.5 py-0.5 text-[11px] font-bold text-ground"
          style={{ background: ratingColor(item.rating) }}
        >
          {formatRating(item.rating)}
        </span>
      )}
    </div>

      {/* seen-state rule: solid accent = watched, dashed = in the queue */}
      {mark === 'done' && <div className="mt-1.5 h-[3px] bg-accent" />}
      {mark === 'current' && <div className="mt-1.5 h-[3px] bg-accent-2" />}
      {mark === 'queue' && <div className="mt-1.5 border-t-[3px] border-dashed border-dim/60" />}
    </motion.div>
  )
}
