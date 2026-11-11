import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Wait this long after the last keystroke before searching. */
const SEARCH_DEBOUNCE_MS = 250

/**
 * Search field for the Library. Typing searches after a short pause; Enter
 * searches at once; Escape or the clear button empties it.
 */
export function LibrarySearch({
  value,
  onSearch,
  label = 'Search the library',
  placeholder = 'Search by title, topic or category',
}: {
  value: string
  onSearch: (value: string) => void
  label?: string
  placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  const [applied, setApplied] = useState(value)
  const input = useRef<HTMLInputElement>(null)

  // Follow outside changes, e.g. "Clear all" or the back button, without
  // trimming a space the learner is still typing.
  if (value !== applied) {
    setApplied(value)
    if (value.trim() !== draft.trim()) setDraft(value)
  }

  useEffect(() => {
    if (draft.trim() === value.trim()) return
    const timer = window.setTimeout(() => onSearch(draft), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, value, onSearch])

  const clear = () => {
    setDraft('')
    onSearch('')
    input.current?.focus()
  }

  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(draft)
      }}
      className="relative w-full max-w-xl"
    >
      <label htmlFor="library-search" className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-nff-text-secondary"
      />
      <input
        ref={input}
        id="library-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && draft) {
            event.preventDefault()
            clear()
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-12 w-full rounded-md border border-nff-border-strong bg-nff-bg-surface pl-11 pr-12 nff-body-md text-foreground placeholder:text-nff-text-secondary nff-focus-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-nff-text-secondary transition-colors hover:bg-[var(--nff-sage-100)] hover:text-foreground nff-focus-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </form>
  )
}
