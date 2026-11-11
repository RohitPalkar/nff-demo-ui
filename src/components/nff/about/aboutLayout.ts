import type { CSSProperties, MouseEvent } from 'react'

/** Inset page rhythm shared with the home sections, header and footer. */
export const OUTER = 'px-2 sm:px-3'
export const FRAME = 'mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14'

export const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/** Split a paragraph into sentences (used to lay out existing copy, never to change it). */
export function sentences(paragraph: string) {
  return paragraph.match(/[^.!?]+[.!?]+(?=\s|$)/g)?.map((part) => part.trim()) ?? [paragraph]
}

export function slugId(prefix: string, text: string) {
  return `${prefix}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

/** Moves to a section without a jump, then hands focus to it for keyboard and screen reader users. */
export function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
  window.history.replaceState(window.history.state, '', `#${id}`)
}
