import { motion } from 'framer-motion'
import { ratingColor, formatRating, titleHue } from '../lib/data.js'

export default function PosterCard({ item, index = 0, ghost = false, square = false, onClick }) {
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
      className={`relative ${square ? 'aspect-square' : 'aspect-[2/3]'} overflow-hidden rounded-lg bg-card shadow-lg shadow-black/40
        ${ghost ? 'opacity-45 saturate-[0.4]' : ''}
        ${clickable ? 'cursor-pointer' : ''}`}
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
          style={{
            background: `linear-gradient(160deg,
              hsl(${titleHue(item.title)} 18% 22%) 0%,
              hsl(${titleHue(item.title)} 22% 11%) 100%)`,
          }}
        >
          <span className="text-[13px] font-semibold leading-snug text-ink/90">
            {item.title}
          </span>
        </div>
      )}

      {item.current && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#97C97C] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#97C97C]" />
        </span>
      )}

      {item.rating != null && (
        <span
          className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold backdrop-blur-sm"
          style={{ color: ratingColor(item.rating) }}
        >
          {formatRating(item.rating)}
        </span>
      )}
    </motion.div>
  )
}
