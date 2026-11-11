import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, Layers, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/admin'
import { ErrorState } from '@/components/admin'
import { StatusChip } from '@/components/nff/StatusChip'
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
import { Skeleton } from '@/components/ui/skeleton'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { addStage, getCmsStages, saveStageOrder } from '@/services/cms'

export function CurriculumPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const manage = can('learning.manage')
  const query = useQuery({ queryKey: ['cms', 'stages'], queryFn: () => getCmsStages() })
  const [order, setOrder] = useState<string[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    if (query.data) setOrder(query.data.map((stage) => stage.id))
  }, [query.data])

  if (query.isPending || (query.data && !order)) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading curriculum</span>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load the curriculum"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const stages = query.data
  const current = order ?? []
  const original = stages.map((stage) => stage.id)
  const dirty = current.join() !== original.join()
  const byId = new Map(stages.map((stage) => [stage.id, stage]))

  function move(index: number, delta: number) {
    const next = [...current]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setOrder(next)
  }

  const movedLive = current.some(
    (id, index) => id !== original[index] && byId.get(id)?.published,
  )

  return (
    <div className="flex flex-col gap-5 pb-20">
      <PageHeader
        title="Curriculum"
        description="Arrange the order of stages."
        action={
          <Button className="h-10" disabled={!manage} onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add stage
          </Button>
        }
      />

      {!manage && (
        <p role="status" className="rounded-xl border bg-nff-bg-muted p-3 nff-body-sm text-muted-foreground">
          You can view the curriculum. Changing it needs an admin.
        </p>
      )}
      {dirty && movedLive && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4 nff-body-sm text-nff-text-warning"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Reordering a live stage changes what practitioners unlock next. Check
          that no one is mid-stage before saving.
        </div>
      )}

      {current.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No stages yet"
          description="Add the first stage to build the curriculum."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {current.map((id, index) => {
            const stage = byId.get(id)!
            return (
              <li
                key={id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nff-bg-brand-subtle nff-label-lg text-nff-text-brand"
                >
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="nff-label-lg">{stage.title}</span>
                  <span className="nff-caption text-muted-foreground">
                    {stage.itemIds.length} items
                  </span>
                </div>
                <StatusChip
                  tone={stage.published ? 'success' : 'neutral'}
                  icon={Layers}
                >
                  {stage.published ? 'Live' : 'Draft'}
                </StatusChip>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${stage.title} up`}
                    disabled={index === 0 || !manage}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${stage.title} down`}
                    disabled={index === current.length - 1 || !manage}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/cms/curriculum/stages/${stage.id}`}>Edit</Link>
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur lg:left-[var(--nff-layout-admin-sidebar)]">
          <span role="status" className="nff-body-sm">
            You have an unsaved order.
          </span>
          <div className="flex gap-3">
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
          </div>
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add stage</DialogTitle>
            <DialogDescription>Give the new stage a title.</DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Stage title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={newTitle.trim().length < 2}
              onClick={() => {
                if (!attempt(() => addStage(newTitle.trim()))) return
                setNewTitle('')
                setAdding(false)
                void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
                toast.success('Stage added.')
              }}
            >
              Add stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
