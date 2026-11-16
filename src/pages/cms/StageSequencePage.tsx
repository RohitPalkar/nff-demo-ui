import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Eye, EyeOff, Headphones, ListPlus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmationDialog, ErrorState, InlineNotice, LoadingState, StatusBadge } from '@/components/admin'
import { AddContentDialog } from '@/components/cms/AddContentDialog'
import { ActionBar, PageHeader, refocusMoved } from '@/components/cms/CmsParts'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { cn } from '@/lib/utils'
import {
  createCmsItem,
  getCmsStages,
  listCmsItemSummaries,
  saveStageDetails,
  saveStageItems,
  type CmsItem,
} from '@/services/cms'

interface Draft {
  ids: string[]
  title: string
  intro: string
  optional: string[]
}

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b)

export function StageSequencePage() {
  const { stageId = '' } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const manage = can('learning.manage')
  const stagesQuery = useQuery({ queryKey: ['cms', 'stages'], queryFn: () => getCmsStages() })
  const itemsQuery = useQuery({ queryKey: ['cms', 'summaries'], queryFn: () => listCmsItemSummaries() })
  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [adding, setAdding] = useState(false)
  const [togglingLive, setTogglingLive] = useState(false)

  const stage = stagesQuery.data?.find((entry) => entry.id === stageId)

  // Load the stage once per stage id, so saving or creating content never wipes unsaved edits.
  useEffect(() => {
    if (!stage) return
    const initial: Draft = { ids: stage.itemIds, title: stage.title, intro: stage.intro, optional: stage.optionalItemIds ?? [] }
    setSaved(initial)
    setDraft(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage?.id])

  if (stagesQuery.isPending || itemsQuery.isPending || (stage && !draft)) return <LoadingState label="Loading stage" rows={6} />
  if (stagesQuery.isError || itemsQuery.isError) {
    return (
      <ErrorState
        title="We could not load this stage"
        description="Check your connection and try again."
        onRetry={() => {
          void stagesQuery.refetch()
          void itemsQuery.refetch()
        }}
      />
    )
  }
  if (!stage || !draft || !saved) {
    return (
      <UnavailableState
        icon={Plus}
        title="We could not find that stage"
        description="Head back to the curriculum to pick a stage."
        trail={[{ label: 'CMS', to: '/cms' }]}
        backTo="/cms/curriculum"
        backLabel="Back to curriculum"
      />
    )
  }

  const items = itemsQuery.data
  const byId = new Map(items.map((item) => [item.id, item]))
  const dirty = !sameDraft(draft, saved)
  const required = draft.ids.filter((id) => !draft.optional.includes(id)).length
  const notLive = draft.ids.filter((id) => byId.get(id) && byId.get(id)!.status !== 'published')
  const explorations = draft.ids.filter((id) => byId.get(id)?.type === 'exploration').length
  const meditations = draft.ids.filter((id) => byId.get(id)?.type === 'meditation').length
  const titleOk = draft.title.trim().length >= 2

  function patch(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current))
  }

  function move(index: number, delta: number) {
    const next = [...draft!.ids]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    patch({ ids: next })
    refocusMoved(next[target]!, delta < 0 ? 'up' : 'down')
  }

  function remove(id: string) {
    const before = draft!
    // Focus goes to the next row's remove button (or the previous one, or the
    // Add content button), never back to the page.
    const at = before.ids.indexOf(id)
    const neighbour = before.ids[at + 1] ?? before.ids[at - 1]
    const refocus = () =>
      (document.querySelector<HTMLElement>(`[data-remove="${neighbour}"]`) ?? document.getElementById('add-content'))?.focus()
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(refocus)
    else setTimeout(refocus, 0)
    patch({ ids: before.ids.filter((entry) => entry !== id), optional: before.optional.filter((entry) => entry !== id) })
    const title = byId.get(id)?.title.trim() || 'Item'
    toast(`Removed “${title}” from the sequence.`, {
      action: { label: 'Undo', onClick: () => setDraft(before) },
    })
  }

  function save() {
    if (!titleOk) {
      toast.error('Give the stage a title of at least 2 characters.')
      return
    }
    const next = draft!
    const done = attempt(() => {
      saveStageItems(stage!.id, next.ids)
      saveStageDetails(stage!.id, { title: next.title.trim(), intro: next.intro, optionalItemIds: next.optional })
    })
    if (!done) return
    setSaved(next)
    void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
    toast.success('Stage saved.')
  }

  function createAndAdd(type: CmsItem['type'], title: string) {
    let created: CmsItem | undefined
    const done = attempt(() => {
      created = createCmsItem(type, undefined, { title, stageId: stage!.id })
      // Saved into the stage straight away, so the new draft is never orphaned.
      saveStageItems(stage!.id, [...saved!.ids, created.id])
    })
    if (!done || !created) return
    const id = created.id
    setSaved((current) => (current ? { ...current, ids: [...current.ids, id] } : current))
    setDraft((current) => (current ? { ...current, ids: [...current.ids, id] } : current))
    setAdding(false)
    void queryClient.invalidateQueries({ queryKey: ['cms', 'summaries'] })
    void queryClient.invalidateQueries({ queryKey: ['cms', type === 'meditation' ? 'meditations' : 'explorations'] })
    toast.success(`Created “${title}” as a draft and added it to this stage.`, {
      action: { label: 'Open editor', onClick: () => navigate(`/cms/${type === 'meditation' ? 'meditations' : 'explorations'}/${id}`) },
    })
  }

  return (
    <div className={cn('flex flex-col gap-5', dirty && 'pb-24')}>
      <PageHeader
        title={`Stage ${stage.number} · ${stage.title}`}
        description="The stage intro and the order practitioners work through it."
        meta={
          <span
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 nff-label-sm',
              stage.published
                ? 'border-nff-border-success bg-nff-bg-success-subtle text-nff-text-success'
                : 'border-[var(--admin-border)] bg-nff-bg-muted text-[var(--admin-text-muted)]',
            )}
          >
            {stage.published ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}
            {stage.published ? 'Live' : 'Draft'}
          </span>
        }
        action={
          <>
            <Button asChild variant="outline" className="h-10">
              <Link to="/cms/curriculum">All stages</Link>
            </Button>
            {manage && (
              <Button variant={stage.published ? 'outline' : 'default'} className="h-10" onClick={() => setTogglingLive(true)}>
                {stage.published ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                {stage.published ? 'Take offline' : 'Go live'}
              </Button>
            )}
          </>
        }
      />

      {!manage && <InlineNotice tone="info">You can view this stage. Changing the curriculum needs an admin.</InlineNotice>}
      {manage && stage.published && (
        <InlineNotice tone="warning">This stage is live. Changes reach practitioners as soon as you save.</InlineNotice>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <aside aria-label="Stage details" className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--admin-topbar-height)+24px)] lg:order-2">
          <fieldset disabled={!manage} className="flex flex-col gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <legend className="sr-only">Details</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-title">Title</Label>
              <Input id="stage-title" value={draft.title} aria-invalid={!titleOk} onChange={(event) => patch({ title: event.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-intro">Intro</Label>
              <Textarea id="stage-intro" rows={5} className="min-h-28" value={draft.intro} onChange={(event) => patch({ intro: event.target.value })} />
              <p className="nff-caption text-[var(--admin-text-muted)]">Shown at the top of the stage in the practitioner app.</p>
            </div>
          </fieldset>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-border)]">
            {[
              ['Items', draft.ids.length],
              ['Required', required],
              ['Explorations', explorations],
              ['Meditations', meditations],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col bg-[var(--admin-surface)] p-3">
                <dt className="nff-caption text-[var(--admin-text-muted)]">{label}</dt>
                <dd className="nff-data-metric tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="nff-caption text-[var(--admin-text-muted)]">
            Unlock rule: the next stage opens when every required item here is complete. Optional items never block it.
          </p>
        </aside>

        <section aria-labelledby="sequence" className="flex min-w-0 flex-col gap-3 lg:order-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sequence" className="admin-section-title">
              Sequence
              <span className="ml-2 nff-body-sm font-normal text-[var(--admin-text-muted)]">
                {draft.ids.length} items · {required} required
              </span>
            </h2>
            {manage && (
              <Button id="add-content" onClick={() => setAdding(true)}>
                <ListPlus aria-hidden="true" className="size-4" />
                Add content
              </Button>
            )}
          </div>

          {notLive.length > 0 && (
            <InlineNotice tone="info">
              {notLive.length === 1 ? '1 item is' : `${notLive.length} items are`} not published yet. Practitioners will not see{' '}
              {notLive.length === 1 ? 'it' : 'them'} until {notLive.length === 1 ? 'it is' : 'they are'} approved in the Review Queue.
            </InlineNotice>
          )}

          {draft.ids.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--admin-border-strong)] p-6">
              <p className="nff-label-lg">No content in this stage yet</p>
              <p className="nff-body-sm text-[var(--admin-text-muted)]">Add explorations and meditations in the order practitioners should meet them.</p>
              {manage && (
                <Button size="sm" onClick={() => setAdding(true)}>
                  <ListPlus aria-hidden="true" className="size-4" />
                  Add content
                </Button>
              )}
            </div>
          ) : (
            <ol className="flex flex-col overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
              {draft.ids.map((id, index) => {
                const item = byId.get(id)
                const title = item ? item.title.trim() || `Untitled ${item.type}` : 'Missing content'
                const Icon = item?.type === 'meditation' ? Headphones : BookOpen
                const isRequired = !draft.optional.includes(id)
                const href = item ? `/cms/${item.type === 'meditation' ? 'meditations' : 'explorations'}/${id}` : null
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--admin-border)] px-3 py-2.5 last:border-b-0 sm:flex-nowrap sm:px-4"
                  >
                    <span aria-hidden="true" className="w-6 shrink-0 text-right nff-caption tabular-nums text-[var(--admin-text-muted)]">
                      {index + 1}
                    </span>
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-[var(--admin-text-muted)]" />
                    <div className="flex min-w-0 flex-1 basis-40 flex-col">
                      {href && can('content.view') ? (
                        <Link to={href} className="nff-target truncate nff-label-md hover:underline nff-focus-ring">
                          {title}
                        </Link>
                      ) : (
                        <span className={cn('truncate nff-label-md', !item && 'text-nff-text-error')}>{title}</span>
                      )}
                      <span className="nff-caption capitalize text-[var(--admin-text-muted)]">{item?.type ?? 'Removed from the library'}</span>
                    </div>
                    {item && <StatusBadge status={item.status} />}
                    <div className="ml-auto flex items-center gap-1">
                      <label className="mr-2 flex items-center gap-2 nff-caption text-[var(--admin-text-muted)]">
                        <span className="w-14 text-right">{isRequired ? 'Required' : 'Optional'}</span>
                        <Switch
                          checked={isRequired}
                          disabled={!manage}
                          aria-label={`${title} is required`}
                          onCheckedChange={(checked) =>
                            patch({ optional: checked ? draft.optional.filter((entry) => entry !== id) : [...draft.optional, id] })
                          }
                        />
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label={`Move ${title} up`}
                        data-move={`${id}:up`}
                        disabled={!manage || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label={`Move ${title} down`}
                        data-move={`${id}:down`}
                        disabled={!manage || index === draft.ids.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-nff-text-error"
                        aria-label={`Remove ${title}`}
                        data-remove={id}
                        disabled={!manage}
                        onClick={() => remove(id)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      {dirty && manage && (
        <ActionBar
          status={
            <span className="flex items-center gap-2">
              {stage.published && <AlertTriangle aria-hidden="true" className="size-4 text-nff-text-warning" />}
              Unsaved changes to this stage.
            </span>
          }
        >
          <Button variant="outline" onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button onClick={save}>Save stage</Button>
        </ActionBar>
      )}

      <AddContentDialog
        open={adding}
        onOpenChange={setAdding}
        stage={stage}
        stages={stagesQuery.data}
        items={items}
        inStage={draft.ids}
        canCreate={can('content.create')}
        onAdd={(ids) => {
          patch({ ids: [...draft.ids, ...ids.filter((id) => !draft.ids.includes(id))] })
          setAdding(false)
          toast.success(ids.length === 1 ? 'Added 1 item. Save the stage to keep it.' : `Added ${ids.length} items. Save the stage to keep them.`)
        }}
        onCreate={createAndAdd}
      />

      <ConfirmationDialog
        open={togglingLive}
        onOpenChange={setTogglingLive}
        title={stage.published ? `Take Stage ${stage.number} offline?` : `Make Stage ${stage.number} live?`}
        description={
          stage.published
            ? 'Practitioners will no longer see this stage or its content in their path.'
            : 'Practitioners will see this stage in their path. Only published items in it are shown.'
        }
        confirmLabel={stage.published ? 'Take offline' : 'Go live'}
        onConfirm={() => {
          setTogglingLive(false)
          if (!attempt(() => saveStageDetails(stage.id, { published: !stage.published }))) return
          void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
          toast.success(stage.published ? 'Stage taken offline.' : 'Stage is live.')
        }}
      />
    </div>
  )
}
