import { BookOpen, Check, Headphones, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { CmsItemSummary, CmsStage } from '@/services/cms'

type Kind = 'all' | 'exploration' | 'meditation'

const titleOf = (item: CmsItemSummary) => item.title.trim() || `Untitled ${item.type}`

/**
 * Pick content for a stage, or create a new draft straight into it.
 *
 * - Every row has a title: items saved before they had one read "Untitled
 *   exploration" (the old picker showed a bare icon).
 * - Items already in this stage are shown, ticked and disabled; items in
 *   another stage say which, since adding them puts them in two places.
 * - Pick several, then add them in one go, in the order picked.
 */
export function AddContentDialog({
  open,
  onOpenChange,
  stage,
  stages,
  items,
  inStage,
  canCreate,
  onAdd,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage: CmsStage
  stages: CmsStage[]
  items: CmsItemSummary[]
  /** Ids already in the stage being edited (including unsaved additions). */
  inStage: readonly string[]
  canCreate: boolean
  onAdd: (ids: string[]) => void
  onCreate: (type: 'exploration' | 'meditation', title: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-2xl">
        {open && (
          <Picker
            stage={stage}
            stages={stages}
            items={items}
            inStage={inStage}
            canCreate={canCreate}
            onAdd={onAdd}
            onCreate={onCreate}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Picker({
  stage,
  stages,
  items,
  inStage,
  canCreate,
  onAdd,
  onCreate,
  onCancel,
}: {
  stage: CmsStage
  stages: CmsStage[]
  items: CmsItemSummary[]
  inStage: readonly string[]
  canCreate: boolean
  onAdd: (ids: string[]) => void
  onCreate: (type: 'exploration' | 'meditation', title: string) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [kind, setKind] = useState<Kind>('all')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [newType, setNewType] = useState<'exploration' | 'meditation'>('exploration')
  const [newTitle, setNewTitle] = useState('')

  const homeOf = useMemo(() => {
    const map = new Map<string, CmsStage>()
    for (const entry of stages) for (const id of entry.itemIds) if (entry.id !== stage.id && !map.has(id)) map.set(id, entry)
    return map
  }, [stages, stage.id])

  const q = query.trim().toLowerCase()
  const shown = items
    .filter((item) => kind === 'all' || item.type === kind)
    .filter((item) => !q || titleOf(item).toLowerCase().includes(q))
    // Not yet in this stage first, then by title.
    .sort((a, b) => Number(inStage.includes(a.id)) - Number(inStage.includes(b.id)) || titleOf(a).localeCompare(titleOf(b)))

  const count = (type: Kind) => items.filter((item) => type === 'all' || item.type === type).length

  function togglePick(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add to Stage {stage.number} · {stage.title}</DialogTitle>
        <DialogDescription>Pick existing explorations and meditations, or start a new draft in this stage.</DialogDescription>
      </DialogHeader>

      {canCreate && (
        <div role="tablist" aria-label="Add content" className="admin-dt-views">
          {(['pick', 'create'] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={mode === entry}
              data-state={mode === entry ? 'active' : 'inactive'}
              className="admin-dt-view nff-target nff-focus-ring"
              onClick={() => setMode(entry)}
            >
              {entry === 'pick' ? 'Existing content' : 'Create new'}
            </button>
          ))}
        </div>
      )}

      {mode === 'pick' ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
              <Input
                type="search"
                aria-label="Search content"
                placeholder="Search by title"
                className="pl-9"
                value={query}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div role="group" aria-label="Type" className="flex gap-1">
              {(['all', 'exploration', 'meditation'] as const).map((entry) => (
                <Button
                  key={entry}
                  type="button"
                  size="sm"
                  variant={kind === entry ? 'default' : 'outline'}
                  aria-pressed={kind === entry}
                  onClick={() => setKind(entry)}
                >
                  {entry === 'all' ? 'All' : entry === 'exploration' ? 'Explorations' : 'Meditations'}
                  <span className="tabular-nums">{count(entry)}</span>
                </Button>
              ))}
            </div>
          </div>

          <ul aria-label="Content" className="-mx-1 flex min-h-48 flex-1 flex-col gap-1 overflow-y-auto px-1">
            {shown.length === 0 && (
              <li className="rounded-lg border border-dashed border-[var(--admin-border-strong)] p-6 text-center nff-body-sm text-[var(--admin-text-muted)]">
                Nothing matches “{query}”.
                {canCreate && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setNewTitle(query)
                      setMode('create')
                    }}
                  >
                    Create “{query}” as a new draft
                  </Button>
                )}
              </li>
            )}
            {shown.map((item) => {
              const already = inStage.includes(item.id)
              const selected = picked.includes(item.id)
              const elsewhere = homeOf.get(item.id)
              const Icon = item.type === 'meditation' ? Headphones : BookOpen
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={already || selected}
                    aria-disabled={already}
                    disabled={already}
                    onClick={() => togglePick(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left nff-focus-ring',
                      selected
                        ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]'
                        : 'border-transparent hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-subtle)]',
                      already && 'cursor-default bg-[var(--admin-surface-subtle)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-sm border',
                        selected || already ? 'border-[var(--admin-primary)] bg-[var(--admin-primary)] text-white' : 'border-[var(--admin-border-strong)]',
                      )}
                    >
                      {(selected || already) && <Check className="size-3.5" />}
                    </span>
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-[var(--admin-text-muted)]" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn('truncate nff-label-md', !item.title.trim() && 'italic text-[var(--admin-text-muted)]')}>
                        {titleOf(item)}
                      </span>
                      <span className="nff-caption text-[var(--admin-text-muted)]">
                        <span className="capitalize">{item.type}</span>
                        {already ? ' · In this stage' : elsewhere ? ` · Also in Stage ${elsewhere.number} · ${elsewhere.title}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </button>
                </li>
              )
            })}
          </ul>

          <DialogFooter className="items-center sm:justify-between">
            <p role="status" className="nff-caption text-[var(--admin-text-muted)]">
              {picked.length === 0 ? 'Nothing picked yet.' : `${picked.length} picked. They go to the end of the sequence.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button disabled={picked.length === 0} onClick={() => onAdd(picked)}>
                {picked.length > 1 ? `Add ${picked.length} items` : 'Add item'}
              </Button>
            </div>
          </DialogFooter>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (newTitle.trim().length >= 3) onCreate(newType, newTitle.trim())
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 nff-label-md">Type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['exploration', 'meditation'] as const).map((entry) => {
                const Icon = entry === 'meditation' ? Headphones : BookOpen
                return (
                  <label
                    key={entry}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                      newType === entry ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]' : 'border-[var(--admin-border)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="new-type"
                      value={entry}
                      checked={newType === entry}
                      onChange={() => setNewType(entry)}
                      className="mt-1 accent-[var(--admin-primary)]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 nff-label-md">
                        <Icon aria-hidden="true" className="size-4" />
                        {entry === 'exploration' ? 'Exploration' : 'Meditation'}
                      </span>
                      <span className="nff-caption text-[var(--admin-text-muted)]">
                        {entry === 'exploration' ? 'A written lesson.' : 'An audio track. Upload the MP3 in the editor.'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-content-title">Title</Label>
            <Input id="new-content-title" value={newTitle} autoFocus onChange={(event) => setNewTitle(event.target.value)} />
            <p className="nff-caption text-[var(--admin-text-muted)]">
              Saved as a draft in Stage {stage.number} and added to the end of this sequence. Finish it in the editor.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={newTitle.trim().length < 3}>
              <Plus aria-hidden="true" className="size-4" />
              Create and add
            </Button>
          </DialogFooter>
        </form>
      )}
    </>
  )
}
