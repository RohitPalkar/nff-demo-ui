import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders the editor's light markdown (## / ### headings, - lists, > quotes,
 * **bold**, _italic_ and [links](url)) as reading text. Text only: no HTML
 * is ever injected, so nothing typed can run.
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) out.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('_')) out.push(<em key={key++}>{token.slice(1, -1)}</em>)
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? []
      const safe = href && /^(https?:|mailto:|\/)/.test(href) ? href : undefined
      out.push(
        <a key={key++} href={safe} className="text-nff-text-link underline underline-offset-4" target="_blank" rel="noreferrer">
          {label}
        </a>,
      )
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function MarkdownPreview({ body, className, limit }: { body: string; className?: string; limit?: number }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
  const shown = limit === undefined ? blocks : blocks.slice(0, limit)
  if (shown.length === 0) return <p className="nff-body-sm text-[var(--admin-text-muted,inherit)]">Nothing written yet.</p>
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {shown.map((block, index) => {
        if (block.startsWith('### ')) return <h3 key={index} className="nff-heading-h4">{inline(block.slice(4))}</h3>
        if (block.startsWith('## ')) return <h2 key={index} className="nff-heading-h3">{inline(block.slice(3))}</h2>
        const lines = block.split('\n')
        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-6 nff-reading-body">
              {lines.map((line, item) => (
                <li key={item}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          )
        }
        if (lines.every((line) => line.startsWith('> '))) {
          return (
            <blockquote key={index} className="border-l-2 border-[var(--nff-color-border-brand,currentColor)] pl-4 italic nff-reading-body">
              {inline(lines.map((line) => line.slice(2)).join(' '))}
            </blockquote>
          )
        }
        return (
          <p key={index} className="nff-reading-body">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}
