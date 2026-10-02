import { useEffect, useState } from 'react'

// true while the page is being scrolled down, false again on any scroll up.
// Stays false near the top, and clamps iOS rubber-band overshoot so the
// bounce at either end does not read as a change of direction.
export default function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const position = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return Math.min(Math.max(window.scrollY, 0), max)
    }
    let last = position()
    const onScroll = () => {
      const y = position()
      if (Math.abs(y - last) < 8) return
      setHidden(y > last && y > 120)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return hidden
}
