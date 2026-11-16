import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Eye, EyeOff, Headphones, Layers, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '@/components/admin'
import { ActionBar, PageHeader, refocusMoved } from '@/components/cms/CmsParts'
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
import { Textarea } from '@/components/ui/textarea'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { cn } from '@/lib/utils'
import { addStage, getCmsStages, listCmsItemSummaries, saveStageOrder, type CmsStage } from '@/services/cms'

export function CurriculumPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const manage = can('learning.manage')
  const query = useQuery({ queryKey: ['cms', 'stages'], queryFn: () => getCmsStages() })
  const summaries = useQuery({ queryKey: ['cms', 'summaries'], queryFn: () => listCmsItemSummaries() })
  const [order, setOrder] = useState<string[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newIntro, setNewIntro] = useState('')

  useEffect(() => {
    if (query.data) setOrder(query.data.map((stage) => stage.id))
  }, [query.data])

  if (query.isPending || (query.data && !order)) return <LoadingState label="Loading curriculum" rows={6} />
  if (query.isError) {
    return (
      <ErrorState title="We could not load the curriculum" description="Check your connection and try again." onRetry={() => void query.refetch()} />
    )
  }

  const stages = query.data
  const current = order ?? []
  const original = stages.map((stage) => stage.id)
  const dirty = current.join() !== original.join()
  const byId = new Map(stages.map((stage) => [stage.id, stage]))
  const typeOf = new Map((summaries.data ?? []).map((item) => [item.id, item.type]))
  const movedLive = current.some((id, index) => id !== original[index] && byId.get(id)?.published)
  const live = stages.filter((stage) => stage.published).length
  const totalItems = stages.reduce((sum, stage) => sum + stage.itemIds.length, 0)

  function move(index: number, delta: number) {
    const next = [...current]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setOrder(next)
    refocusMoved(next[target]!, delta < 0 ? 'up' : 'down')
  }

  function create(open: boolean) {
    let stage: CmsStage | undefined
    if (!attempt(() => (stage = addStage(newTitle.trim(), undefined, newIntro.trim())))) return
    setNewTitle('')
    setNewIntro('')
    setAdding(false)
    void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
    toast.success(`Stage “${stage!.title}” added as a draft.`)
    if (open) navigate(`/cms/curriculum/stages/${stage!.id}`)
  }

  const count = (stage: CmsStage, type: 'exploration' | 'meditation') => stage.itemIds.filter((id) => typeOf.get(id) === type).length

  return (
    <div className={cn('flex flex-col gap-5', dirty && 'pb-24')}>
      <PageHeader
        title="Curriculum"
        description={`${stages.length} stages · ${live} live · ${totalItems} items. Practitioners move through the stages in this order.`}
        action={
          manage && (
            <Button className="h-10" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" className="size-4" />
              Add stage
            </Button>
          )
        }
      />

      {!manage && <InlineNotice tone="info">You can view the curriculum. Changing it needs an admin.</InlineNotice>}
      {dirty && movedLive && (
        <InlineNotice tone="warning">
          Reordering a live stage changes what practitioners unlock next. Check that no one is mid-stage before saving.
        </InlineNotice>
      )}

      {current.length === 0 ? (
        <EmptyState icon={Layers} title="No stages yet" description="Add the first stage to build the curriculum." />
      ) : (
        <ol aria-label="Stages" className="flex flex-col overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          {current.map((id, index) => {
            const stage = byId.get(id)!
            const moved = original[index] !== id
            return (
              <li
                key={id}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--admin-border)] p-3 last:border-b-0 sm:flex-nowrap sm:p-4',
                  moved && 'bg-nff-bg-warning-subtle/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--admin-nav-active-bg)] nff-label-lg text-[var(--admin-primary)] tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                  <Link to={`/cms/curriculum/stages/${stage.id}`} className="nff-target w-fit nff-label-lg hover:underline nff-focus-ring">
                    {stage.title}
                  </Link>
                  {stage.intro && <p className="line-clamp-1 nff-caption text-[var(--admin-text-muted)]">{stage.intro}</p>}
                  <p className="flex flex-wrap items-center gap-x-3 nff-caption text-[var(--admin-text-muted)]">
                    <span>{stage.itemIds.length} items</span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen aria-hidden="true" className="size-3.5" />
                      {count(stage, 'exploration')} explorations
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Headphones aria-hidden="true" className="size-3.5" />
                      {count(stage, 'meditation')} meditations
                    </span>
                  </p>
                </div>
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
                <div className="ml-auto flex items-center gap-1">
                  {manage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label={`Move ${stage.title} up`}
                        data-move={`${id}:up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label={`Move ${stage.title} down`}
                        data-move={`${id}:down`}
                        disabled={index === current.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/cms/curriculum/stages/${stage.id}`} aria-label={`${manage ? 'Edit' : 'Open'} ${stage.title}`}>
                      {manage ? 'Edit' : 'Open'}
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {dirty && (
        <ActionBar status="The stage order has unsaved changes.">
          <Button variant="outline" onClick={() => setOrder(original)}>
            Discard
          </Button>
          <Button
            onClick={() => {
              if (!attempt(() => saveStageOrder(current))) return
              void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
              toast.success('Stage order saved.')
            }}
          >
            Save order
          </Button>
        </ActionBar>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (newTitle.trim().length >= 2) create(true)
            }}
          >
            <DialogHeader>
              <DialogTitle>Add stage</DialogTitle>
              <DialogDescription>
                It is added at the end as Stage {stages.length + 1}, in draft. Practitioners do not see it until you make it live.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-stage-title">Title</Label>
              <Input id="new-stage-title" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-stage-intro">
                Intro <span className="font-normal text-[var(--admin-text-muted)]">(optional)</span>
              </Label>
              <Textarea id="new-stage-intro" rows={3} value={newIntro} onChange={(event) => setNewIntro(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={newTitle.trim().length < 2} onClick={() => create(false)}>
                Add stage
              </Button>
              <Button type="submit" disabled={newTitle.trim().length < 2}>
                Add and add content
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
