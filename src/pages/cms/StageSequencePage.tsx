import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Headphones,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '@/components/nff/ErrorState'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  getCmsStages,
  listAllCmsItems,
  saveStageDetails,
  saveStageItems,
} from '@/services/cms'

export function StageSequencePage() {
  const { stageId = '' } = useParams()
  const queryClient = useQueryClient()
  const stagesQuery = useQuery({ queryKey: ['cms', 'stages'], queryFn: getCmsStages })
  const itemsQuery = useQuery({ queryKey: ['cms', 'all'], queryFn: listAllCmsItems })
  const [ids, setIds] = useState<string[] | null>(null)
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [required, setRequired] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [dirty, setDirty] = useState(false)

  const stage = stagesQuery.data?.find((entry) => entry.id === stageId)

  useEffect(() => {
    if (stage) {
      setIds(stage.itemIds)
      setTitle(stage.title)
      setIntro(stage.intro)
    }
  }, [stage])

  if (stagesQuery.isPending || itemsQuery.isPending || (stage && !ids)) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading stage</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
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
  if (!stage || !ids) {
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

  function change(next: string[]) {
    setIds(next)
    setDirty(true)
  }

  function move(index: number, delta: number) {
    const next = [...ids!]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    change(next)
  }

  function add(id: string) {
    if (ids!.includes(id)) {
      toast.error('That item is already in this stage.')
      return
    }
    change([...ids!, id])
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-5 pb-20">
      <header className="flex flex-col gap-1">
        <h1 className="nff-heading-h2">
          Stage {stage.number} · {stage.title}
        </h1>
        <Link
          to="/cms/curriculum"
          className="w-fit nff-body-sm text-nff-text-link hover:underline"
        >
          Back to curriculum
        </Link>
      </header>

      {stage.published && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4 nff-body-sm text-nff-text-warning"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          This stage is live. Changes affect practitioners as soon as you save.
        </div>
      )}

      <section
        aria-label="Stage details"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage-title">Title</Label>
          <Input
            id="stage-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setDirty(true)
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stage-intro">Intro</Label>
          <Textarea
            id="stage-intro"
            rows={3}
            value={intro}
            onChange={(event) => {
              setIntro(event.target.value)
              setDirty(true)
            }}
          />
        </div>
        <p className="nff-caption text-muted-foreground">
          Unlock rule: the next stage opens when every required item in this stage
          is complete.
        </p>
      </section>

      <section aria-labelledby="sequence" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="sequence" className="nff-heading-h3">
            Sequence · {ids.length} items
          </h2>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add content
          </Button>
        </div>
        {ids.length === 0 ? (
          <p className="nff-body-sm text-muted-foreground">
            No content in this stage yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ids.map((id, index) => {
              const item = byId.get(id)
              const Icon = item?.type === 'meditation' ? Headphones : BookOpen
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate nff-label-md">
                    {item ? item.title : 'Missing content'}
                  </span>
                  {!item && (
                    <span className="nff-caption text-nff-text-error">
                      Missing content
                    </span>
                  )}
                  <label className="flex items-center gap-2 nff-caption text-muted-foreground">
                    Required
                    <Switch
                      checked={required[id] ?? true}
                      onCheckedChange={(checked) =>
                        setRequired((current) => ({ ...current, [id]: checked }))
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${item?.title ?? 'item'} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Move ${item?.title ?? 'item'} down`}
                    disabled={index === ids.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Remove ${item?.title ?? 'item'}`}
                    onClick={() => change(ids.filter((entry) => entry !== id))}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur lg:left-[var(--nff-layout-admin-sidebar)]">
          <span role="status" className="nff-body-sm">
            You have unsaved changes.
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIds(stage.itemIds)
                setTitle(stage.title)
                setIntro(stage.intro)
                setDirty(false)
              }}
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                saveStageItems(stage.id, ids)
                saveStageDetails(stage.id, { title, intro })
                setDirty(false)
                void queryClient.invalidateQueries({ queryKey: ['cms', 'stages'] })
                toast.success('Stage saved.')
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add content</SheetTitle>
            <SheetDescription>
              Search explorations and meditations.
            </SheetDescription>
          </SheetHeader>
          <Command className="mx-4 mb-4 rounded-lg border">
            <CommandInput placeholder="Search content" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup heading="Content">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.id}`}
                    onSelect={() => add(item.id)}
                  >
                    {item.type === 'meditation' ? (
                      <Headphones aria-hidden="true" className="size-4" />
                    ) : (
                      <BookOpen aria-hidden="true" className="size-4" />
                    )}
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </SheetContent>
      </Sheet>
    </div>
  )
}
