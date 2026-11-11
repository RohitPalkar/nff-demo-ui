import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bold,
  Heading2,
  Heading3,
  History,
  Italic,
  Link2,
  List,
  Quote,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ContentStatusChip, ReviewFeedback, RevisionNotice, PendingRevisionWarning } from '@/components/cms/CmsParts'
import { OwnershipPanel } from '@/components/cms/OwnershipPanel'
import { ErrorState } from '@/components/admin'
import { UnavailableState } from '@/components/nff/UnavailableState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { readJson, writeJson } from '@/mocks/api'
import { stages } from '@/mocks/db'
import {
  discardRevision,
  getCmsItem,
  isLiveStatus,
  submitRevision,
  saveCmsItem,
  setCmsStatus,
  validateItem,
  type CmsItem,
} from '@/services/cms'
import type { Category } from '@/types'

interface Version {
  at: string
  author: string
  item: CmsItem
}

const versionsKey = (id: string) => `nff.cms.versions.${id}`

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ago(at: number | null) {
  if (!at) return 'Not saved yet'
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 15) return 'Saved just now'
  if (seconds < 90) return `Saved ${seconds}s ago`
  return `Saved ${Math.round(seconds / 60)} min ago`
}

export function ExplorationEditorPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cms', 'item', id],
    queryFn: () => getCmsItem(id),
  })
  const [draft, setDraft] = useState<CmsItem | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, tick] = useState(0)
  const [versions, setVersions] = useState<Version[]>(() =>
    readJson<Version[]>(versionsKey(id), []),
  )
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const save = useCallback(
    (quiet = false) => {
      if (!draft) return
      let saved!: CmsItem
      if (!attempt(() => (saved = saveCmsItem(draft)))) return
      const next = [
        { at: saved.updatedAt, author: user?.name ?? 'You', item: saved },
        ...readJson<Version[]>(versionsKey(draft.id), []),
      ].slice(0, 10)
      writeJson(versionsKey(draft.id), next)
      setVersions(next)
      setDirty(false)
      setSavedAt(Date.now())
      void queryClient.invalidateQueries({ queryKey: ['cms'] })
      if (!quiet) toast.success('Saved.')
    },
    [draft, queryClient, user?.name],
  )

  // Autosave every 10 seconds while there are changes.
  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => save(true), 10_000)
    return () => window.clearTimeout(timer)
  }, [dirty, draft, save])

  useEffect(() => {
    const interval = window.setInterval(() => tick((value) => value + 1), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  function update(patch: Partial<CmsItem>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setDirty(true)
  }

  function wrap(before: string, after = before, placeholder = 'text') {
    const el = bodyRef.current
    if (!el || !draft) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = draft.body.slice(start, end) || placeholder
    update({
      body:
        draft.body.slice(0, start) + before + selected + after + draft.body.slice(end),
    })
  }

  function linePrefix(prefix: string) {
    const el = bodyRef.current
    if (!el || !draft) return
    const start = draft.body.lastIndexOf('\n', el.selectionStart - 1) + 1
    update({ body: draft.body.slice(0, start) + prefix + draft.body.slice(start) })
  }

  function transition(status: CmsItem['status'], message: string) {
    if (!draft) return
    const found = validateItem(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error('Fix the highlighted fields first.')
      return
    }
    save(true)
    if (!attempt(() => setCmsStatus(draft.id, status))) return
    setDraft({ ...draft, status })
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
    toast.success(message)
  }

  if (query.isPending || (!draft && query.data)) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading exploration</span>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load this exploration"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!draft) {
    return (
      <UnavailableState
        icon={ArrowLeft}
        title="We could not find that exploration"
        description="It may have been removed."
        trail={[{ label: 'CMS', to: '/cms' }]}
        backTo="/cms/explorations"
        backLabel="Back to explorations"
      />
    )
  }

  const canPublish = can('content.publish')
  const canSubmit = can('content.submit')
  const toolbar = [
    { label: 'Heading 2', icon: Heading2, run: () => linePrefix('## ') },
    { label: 'Heading 3', icon: Heading3, run: () => linePrefix('### ') },
    { label: 'Bold', icon: Bold, run: () => wrap('**') },
    { label: 'Italic', icon: Italic, run: () => wrap('_') },
    { label: 'Bulleted list', icon: List, run: () => linePrefix('- ') },
    { label: 'Link', icon: Link2, run: () => wrap('[', '](https://)', 'link text') },
    { label: 'Quote', icon: Quote, run: () => linePrefix('> ') },
  ]

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9">
          <Link to="/cms/explorations" aria-label="Back to explorations">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <h1 className="nff-heading-h3 min-w-0 flex-1 truncate">
          {draft.title || 'Untitled exploration'}
        </h1>
        <ContentStatusChip status={draft.status} />
        <span role="status" className="nff-caption text-muted-foreground">
          {dirty ? 'Unsaved changes' : ago(savedAt)}
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <History aria-hidden="true" className="size-4" />
              History
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Version history</SheetTitle>
              <SheetDescription>
                Restore an earlier saved version.
              </SheetDescription>
            </SheetHeader>
            <ul className="flex flex-col gap-3 px-4">
              {versions.length === 0 && (
                <li className="nff-body-sm text-muted-foreground">
                  No saved versions yet.
                </li>
              )}
              {versions.map((version) => (
                <li
                  key={version.at}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <span className="nff-body-sm">
                    {version.author}
                    <br />
                    <span className="nff-caption text-muted-foreground">
                      {new Date(version.at).toLocaleString()}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Restoring brings back content, never review state.
                      setDraft({
                        ...version.item,
                        status: draft.status,
                        scheduledFor: draft.scheduledFor,
                        rejectionNote: draft.rejectionNote,
                      })
                      setDirty(true)
                      toast.success('Version restored. Save to keep it.')
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/cms/preview/exploration/${draft.id}`)}
        >
          Preview
        </Button>
      </header>

      {can('content.publish') && <PendingRevisionWarning item={draft} />}
      {isLiveStatus(draft.status) && !can('content.publish') && (
        <RevisionNotice
          item={draft}
          canSubmit={canSubmit}
          onSubmit={() => {
            save(true)
            if (!attempt(() => submitRevision(draft.id))) return
            void queryClient.invalidateQueries({ queryKey: ['cms'] })
            toast.success('Revision submitted for review.')
          }}
          onDiscard={() => {
            if (!attempt(() => discardRevision(draft.id))) return
            setDirty(false)
            void queryClient.invalidateQueries({ queryKey: ['cms'] })
            toast.success('Revision discarded.')
          }}
        />
      )}
      {draft.status === 'rejected' && (
        <ReviewFeedback note={draft.rejectionNote} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => {
                const title = event.target.value
                update({
                  title,
                  slug: draft.slug || slugify(title),
                  seoTitle: draft.seoTitle || title,
                })
              }}
            />
            {errors.title && (
              <p role="alert" className="nff-body-sm text-nff-text-error">
                {errors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div
              role="toolbar"
              aria-label="Formatting"
              className="flex flex-wrap gap-1 rounded-md border bg-card p-1"
            >
              {toolbar.map((entry) => (
                <Button
                  key={entry.label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={entry.label}
                  onClick={entry.run}
                >
                  <entry.icon aria-hidden="true" className="size-4" />
                </Button>
              ))}
            </div>
            <Textarea
              ref={bodyRef}
              aria-label="Body"
              rows={18}
              value={draft.body}
              onChange={(event) => update({ body: event.target.value })}
              className="font-mono"
            />
          </div>
        </section>

        <aside
          aria-label="Metadata"
          className="flex flex-col gap-4 rounded-xl border bg-card p-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={draft.slug}
              aria-invalid={Boolean(errors.slug)}
              onChange={(event) => update({ slug: event.target.value })}
            />
            {errors.slug && (
              <p role="alert" className="nff-body-sm text-nff-text-error">
                {errors.slug}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={draft.category}
              onValueChange={(value) => update({ category: value as Category })}
            >
              <SelectTrigger id="category" className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['foundations', 'understand', 'contemplate', 'explore'].map(
                  (entry) => (
                    <SelectItem key={entry} value={entry} className="capitalize">
                      {entry}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={draft.stageId}
              onValueChange={(value) => update({ stageId: value })}
            >
              <SelectTrigger id="stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    Stage {entry.number} · {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              rows={3}
              value={draft.excerpt}
              aria-invalid={Boolean(errors.excerpt)}
              onChange={(event) => update({ excerpt: event.target.value })}
            />
            {errors.excerpt && (
              <p role="alert" className="nff-body-sm text-nff-text-error">
                {errors.excerpt}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo-title">SEO title</Label>
            <Input
              id="seo-title"
              value={draft.seoTitle}
              onChange={(event) => update({ seoTitle: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo-desc">SEO description</Label>
            <Textarea
              id="seo-desc"
              rows={2}
              value={draft.seoDescription}
              onChange={(event) => update({ seoDescription: event.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="featured">Featured on home</Label>
            <Switch
              id="featured"
              checked={draft.featured}
              onCheckedChange={(checked) => update({ featured: checked })}
            />
          </div>
          {can('content.ownership.manage') && (
            <OwnershipPanel
              key={`${draft.ownerId}-${(draft.collaboratorIds ?? []).join()}`}
              item={draft}
              onChanged={() => void queryClient.invalidateQueries({ queryKey: ['cms'] })}
            />
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur lg:left-[var(--nff-layout-admin-sidebar)]">
        <Button variant="outline" disabled={!dirty || !can('content.edit')} onClick={() => save()}>
          Save draft
        </Button>
        {(draft.status === 'draft' || draft.status === 'rejected') && canSubmit ? (
          <Button onClick={() => transition('in_review', 'Submitted for review.')}>
            Submit for review
          </Button>
        ) : null}
        {canPublish && draft.status !== 'published' && (
          <Button onClick={() => transition('published', 'Published.')}>
            Publish
          </Button>
        )}
      </div>

      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now they will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
