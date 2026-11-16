import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bold,
  Heading2,
  Heading3,
  Eye,
  History,
  Italic,
  Link2,
  List,
  Quote,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionBar,
  CATEGORY_OPTIONS,
  ContentStatusChip,
  EditorCard,
  FieldError, describeErrors,
  PendingRevisionWarning,
  ReadinessChecklist,
  ReviewFeedback,
  RevisionNotice,
} from '@/components/cms/CmsParts'
import { MarkdownPreview } from '@/components/cms/MarkdownPreview'
import { OwnershipPanel } from '@/components/cms/OwnershipPanel'
import { SOW_SCOPE } from '@/config/sowScope'
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
import {
  discardRevision,
  getCmsItem,
  isLiveStatus,
  loadStages,
  submitRevision,
  saveCmsItem,
  setCmsStatus,
  validateItem,
  type CmsItem,
} from '@/services/cms'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

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

const FIELD_LABELS = { title: 'Title', slug: 'Web address', excerpt: 'Summary' }

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
  const [bodyMode, setBodyMode] = useState<'write' | 'preview'>('write')
  const stageOptions = loadStages()

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
      toast.error(describeErrors(found, FIELD_LABELS))
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

  const words = draft.body.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 220))

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9">
          <Link to="/cms/explorations" aria-label="Back to explorations">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="nff-caption text-[var(--admin-text-muted)]">Exploration</span>
          <h1 className="truncate admin-page-title">{draft.title || 'Untitled exploration'}</h1>
        </div>
        <ContentStatusChip status={draft.status} />
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
              <SheetDescription>Restore an earlier saved version.</SheetDescription>
            </SheetHeader>
            <ul className="flex flex-col gap-3 px-4">
              {versions.length === 0 && <li className="nff-body-sm text-muted-foreground">No saved versions yet.</li>}
              {versions.map((version) => (
                <li key={version.at} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="nff-body-sm">
                    {version.author}
                    <br />
                    <span className="nff-caption text-muted-foreground">{new Date(version.at).toLocaleString()}</span>
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
        {can('content.preview') && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/cms/preview/exploration/${draft.id}`)}>
            <Eye aria-hidden="true" className="size-4" />
            Preview
          </Button>
        )}
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
      {draft.status === 'rejected' && <ReviewFeedback note={draft.rejectionNote} />}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Writing" className="flex min-w-0 flex-col rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="nff-caption text-[var(--admin-text-muted)]">
                Title
              </Label>
              <input
                id="title"
                value={draft.title}
                placeholder="Give it a title"
                aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined}
                onChange={(event) => {
                  const title = event.target.value
                  update({
                    title,
                    slug: !draft.slug || draft.slug === slugify(draft.title) ? slugify(title) : draft.slug,
                    seoTitle: !draft.seoTitle || draft.seoTitle === draft.title ? title : draft.seoTitle,
                  })
                }}
                className="min-h-11 w-full rounded-sm border-b border-[var(--admin-border)] bg-transparent pb-2 text-2xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-primary)] aria-[invalid=true]:border-nff-border-error"
              />
              <FieldError id="title-error" message={errors.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="excerpt">Summary</Label>
                <span className="nff-caption tabular-nums text-[var(--admin-text-muted)]">{draft.excerpt.length} / 200</span>
              </div>
              <Textarea
                id="excerpt"
                rows={2}
                placeholder="One or two sentences shown on cards and to visitors."
                value={draft.excerpt}
                aria-invalid={Boolean(errors.excerpt)} aria-describedby={errors.excerpt ? 'excerpt-error' : undefined}
                onChange={(event) => update({ excerpt: event.target.value })}
              />
              <FieldError id="excerpt-error" message={errors.excerpt} />
            </div>
          </div>

          <div className="sticky top-[var(--admin-topbar-height)] z-10 flex flex-wrap items-center justify-between gap-2 border-y border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1.5 sm:px-4">
            <div role="tablist" aria-label="Body view" className="flex gap-1">
              {(['write', 'preview'] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  role="tab"
                  size="sm"
                  aria-selected={bodyMode === mode}
                  variant={bodyMode === mode ? 'secondary' : 'ghost'}
                  onClick={() => setBodyMode(mode)}
                >
                  {mode === 'write' ? 'Write' : 'Preview'}
                </Button>
              ))}
            </div>
            {bodyMode === 'write' && (
              <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5">
                {toolbar.map((entry) => (
                  <Button key={entry.label} type="button" variant="ghost" size="icon" className="size-11" aria-label={entry.label} title={entry.label} onClick={entry.run}>
                    <entry.icon aria-hidden="true" className="size-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {bodyMode === 'write' ? (
              <Textarea
                ref={bodyRef}
                aria-label="Body"
                value={draft.body}
                placeholder="Start writing. Leave a blank line between paragraphs."
                onChange={(event) => update({ body: event.target.value })}
                className="min-h-[28rem] resize-y border-0 px-0 text-base leading-7 shadow-none focus-visible:ring-0"
              />
            ) : (
              <MarkdownPreview body={draft.body} className="mx-auto max-w-prose" />
            )}
          </div>
          <p className="border-t border-[var(--admin-border)] px-4 py-2 nff-caption tabular-nums text-[var(--admin-text-muted)] sm:px-6">
            {words.toLocaleString()} words · about {minutes} min read
          </p>
        </section>

        <aside aria-label="Settings" className="flex flex-col gap-5">
          <EditorCard title="Publishing checks">
            <ReadinessChecklist item={draft} />
          </EditorCard>

          <EditorCard title="Placement">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage">Stage</Label>
              <Select value={draft.stageId} onValueChange={(value) => update({ stageId: value })}>
                <SelectTrigger id="stage" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((entry, index) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      Stage {index + 1} · {entry.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={draft.category} onValueChange={(value) => update({ category: value as Category })}>
                <SelectTrigger id="category" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <Label htmlFor="featured">Featured on home</Label>
                <span className="nff-caption text-[var(--admin-text-muted)]">Shown in the home page carousel.</span>
              </div>
              <Switch id="featured" checked={draft.featured} onCheckedChange={(checked) => update({ featured: checked })} />
            </div>
          </EditorCard>

          <EditorCard title="Search and sharing">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Web address</Label>
              <div className="flex rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r border-input bg-[var(--admin-surface-subtle)] px-2 nff-caption text-[var(--admin-text-muted)]">/explorations/</span>
                <input
                  id="slug"
                  value={draft.slug}
                  aria-invalid={Boolean(errors.slug)} aria-describedby={errors.slug ? 'slug-error' : undefined}
                  onChange={(event) => update({ slug: event.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-r-md bg-transparent px-2 text-sm outline-none"
                />
              </div>
              <FieldError id="slug-error" message={errors.slug} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-title">SEO title</Label>
                <span className={cn('nff-caption tabular-nums', draft.seoTitle.length > 60 ? 'text-nff-text-warning' : 'text-[var(--admin-text-muted)]')}>
                  {draft.seoTitle.length} / 60
                </span>
              </div>
              <Input id="seo-title" value={draft.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-desc">SEO description</Label>
                <span className={cn('nff-caption tabular-nums', draft.seoDescription.length > 160 ? 'text-nff-text-warning' : 'text-[var(--admin-text-muted)]')}>
                  {draft.seoDescription.length} / 160
                </span>
              </div>
              <Textarea id="seo-desc" rows={3} value={draft.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} />
            </div>
            <div aria-label="Search result preview" className="flex flex-col gap-0.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3">
              <span className="truncate nff-caption text-[var(--admin-text-muted)]">meadow / explorations / {draft.slug || 'web-address'}</span>
              <span className="line-clamp-1 nff-label-md text-nff-text-link">{draft.seoTitle || draft.title || 'SEO title'}</span>
              <span className="line-clamp-2 nff-caption text-[var(--admin-text-muted)]">{draft.seoDescription || draft.excerpt || 'SEO description'}</span>
            </div>
          </EditorCard>

          {/* Ownership is not in SOW v1.3 (see config/sowScope.ts). */}
          {SOW_SCOPE.contentOwnership && can('content.ownership.manage') && (
            <OwnershipPanel
              key={`${draft.ownerId}-${(draft.collaboratorIds ?? []).join()}`}
              item={draft}
              onChanged={() => void queryClient.invalidateQueries({ queryKey: ['cms'] })}
            />
          )}
        </aside>
      </div>

      <ActionBar status={dirty ? 'Unsaved changes · autosaves every 10 seconds' : ago(savedAt)}>
        <Button variant="outline" disabled={!dirty || !can('content.edit')} onClick={() => save()}>
          Save draft
        </Button>
        {(draft.status === 'draft' || draft.status === 'rejected') && canSubmit && (
          <Button variant={canPublish ? 'outline' : 'default'} onClick={() => transition('in_review', 'Submitted for review.')}>
            Submit for review
          </Button>
        )}
        {canPublish && draft.status !== 'published' && <Button onClick={() => transition('published', 'Published.')}>Publish</Button>}
      </ActionBar>

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
