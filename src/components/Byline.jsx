import { Fragment } from 'react'

// each fact is one unit, so a wrap falls between "Abel Ferrara ·" and
// "96 min" rather than leaving "min" alone on the next line
export default function Byline({ parts }) {
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      <span className="inline-block">
        {part}
        {i < parts.length - 1 && ' ·'}
      </span>
    </Fragment>
  ))
}
