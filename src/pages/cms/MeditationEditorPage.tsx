import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Eye, ImagePlus, Loader2, Lock, RefreshCw, Trash2, Unlock, UploadCloud, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/admin'
import {
  ActionBar,
  ContentStatusChip,
  PendingRevisionWarning,
  ReadinessChecklist,
  ReviewFeedback,
  RevisionNotice,
  EditorCard,
  FieldError, describeErrors,
  TRANSCODE_META,
} from '@/components/cms/CmsParts'
import { OwnershipPanel } from '@/components/cms/OwnershipPanel'
import { SOW_SCOPE } from '@/config/sowScope'
import { AudioPlayer } from '@/components/nff/AudioPlayer'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { content } from '@/mocks/db'
import {
  discardRevision,
  getCmsItem,
  isLiveStatus,
  loadStages,
  saveCmsItem,
  setCmsStatus,
  submitRevision,
  validateItem,
  type CmsItem,
} from '@/services/cms'
import type { Category, TranscodeStatus } from '@/types'
import { CATEGORY_OPTIONS } from '@/components/cms/CmsParts'

const STEPS = ['Upload', 'Validate', 'Transcode 64 / 128 / 256', 'Publish to CDN'] as const

const STEP_FOR: Record<TranscodeStatus, number> = { uploading: 0, validating: 1, transcoding: 2, ready: 4, failed: 2 }

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const FIELD_LABELS = { title: 'Title', slug: 'Web address', excerpt: 'Description' }

export function MeditationEditorPage() {
  const { id = '' } = useParams()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['cms', 'item', id], queryFn: () => getCmsItem(id) })
  const [draft, setDraft] = useState<CmsItem | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [artwork, setArtwork] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [failReason, setFailReason] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const stages = loadStages()

  useEffect(() => {
    if (query.data) {
      setDraft(query.data)
      const base = content.find((entry) => entry.id === query.data!.id)
      if (base?.type === 'meditation') setAudioSrc(base.audioUrl)
    }
  }, [query.data])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  function patch(next: Partial<CmsItem>) {
    setDraft((current) => (current ? { ...current, ...next } : current))
  }

  function runPipeline(file: File | null, forceFail: boolean) {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    setFailReason(null)
    patch({ transcode: 'uploading' })
    const schedule = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    schedule(900, () => patch({ transcode: 'validating' }))
    schedule(2100, () => patch({ transcode: 'transcoding' }))
    schedule(3600, () => {
      if (forceFail) {
        patch({ transcode: 'failed' })
        setFailReason('The audio stream could not be decoded at 128 kbps.')
        return
      }
      setDraft((current) => (current ? { ...current, transcode: 'ready', durationSec: current.durationSec || 600 } : current))
      if (file) {
        const url = URL.createObjectURL(file)
        setAudioSrc(url)
        const probe = new Audio(url)
        probe.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(probe.duration) && probe.duration > 0) patch({ durationSec: Math.round(probe.duration) })
        })
      }
    })
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') {
      toast.error('Upload an MP3 file.')
      return
    }
    setFileName(file.name)
    runPipeline(file, /fail/i.test(file.name))
  }

  function persist(status?: CmsItem['status'], message = 'Saved.') {
    if (!draft) return false
    const found = validateItem(draft)
    setErrors(found)
    if (status && Object.keys(found).length > 0) {
      toast.error(describeErrors(found, FIELD_LABELS))
      return false
    }
    if (status === 'published' && draft.transcode !== 'ready') {
      toast.error('Audio must be ready before publishing.')
      return false
    }
    if (!attempt(() => saveCmsItem(draft))) return false
    if (status) {
      if (!attempt(() => setCmsStatus(draft.id, status))) return false
      setDraft({ ...draft, status })
    }
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
    toast.success(message)
    return true
  }

  if (query.isPending || (!draft && query.data)) return <LoadingState label="Loading meditation" rows={6} />
  if (query.isError) {
    return <ErrorState title="We could not load this meditation" description="Check your connection and try again." onRetry={() => void query.refetch()} />
  }
  if (!draft) {
    return (
      <UnavailableState
        icon={ArrowLeft}
        title="We could not find that meditation"
        description="It may have been removed."
        trail={[{ label: 'CMS', to: '/cms' }]}
        backTo="/cms/meditations"
        backLabel="Back to meditations"
      />
    )
  }

  const step = STEP_FOR[draft.transcode]
  const processing = ['uploading', 'validating', 'transcoding'].includes(draft.transcode)
  const canPublish = can('content.publish')
  const canSubmit = can('content.submit')
  const canEdit = can('content.edit')
  const dirty = JSON.stringify(draft) !== JSON.stringify(query.data)

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9">
          <Link to="/cms/meditations" aria-label="Back to meditations">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="nff-caption text-[var(--admin-text-muted)]">Meditation</span>
          <h1 className="truncate admin-page-title">{draft.title || 'Untitled meditation'}</h1>
        </div>
        <ContentStatusChip status={draft.status} />
        {can('content.preview') && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/cms/preview/meditation/${draft.id}`)}>
            <Eye aria-hidden="true" className="size-4" />
            Preview
          </Button>
        )}
      </header>

      {canPublish && <PendingRevisionWarning item={draft} />}
      {isLiveStatus(draft.status) && !canPublish && (
        <RevisionNotice
          item={draft}
          canSubmit={canSubmit}
          onSubmit={() => {
            if (!persist()) return
            if (!attempt(() => submitRevision(draft.id))) return
            void queryClient.invalidateQueries({ queryKey: ['cms'] })
            toast.success('Revision submitted for review.')
          }}
          onDiscard={() => {
            if (!attempt(() => discardRevision(draft.id))) return
            void queryClient.invalidateQueries({ queryKey: ['cms'] })
            toast.success('Revision discarded.')
          }}
        />
      )}
      {draft.status === 'rejected' && <ReviewFeedback note={draft.rejectionNote} />}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <EditorCard title="Details" description="What practitioners see on the track's page and card.">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-title">Title</Label>
              <Input
                id="m-title"
                value={draft.title}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'm-title-error' : undefined}
                className="h-11 text-lg"
                onChange={(event) => {
                  const title = event.target.value
                  const autoSlug = !draft.slug || draft.slug === slugify(draft.title)
                  patch({ title, ...(autoSlug ? { slug: slugify(title) } : {}) })
                }}
              />
              <FieldError id="m-title-error" message={errors.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-slug">Web address</Label>
              <div className="flex rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r border-input bg-[var(--admin-surface-subtle)] px-3 nff-caption text-[var(--admin-text-muted)]">/meditations/</span>
                <input
                  id="m-slug"
                  value={draft.slug}
                  aria-invalid={Boolean(errors.slug)}
                  aria-describedby={errors.slug ? 'm-slug-error' : undefined}
                  onChange={(event) => patch({ slug: event.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-r-md bg-transparent px-3 text-sm outline-none"
                />
              </div>
              <FieldError id="m-slug-error" message={errors.slug} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="m-desc">Description</Label>
                <span className="nff-caption tabular-nums text-[var(--admin-text-muted)]">{draft.excerpt.length} / 200</span>
              </div>
              <Textarea id="m-desc" rows={3} className="min-h-24" value={draft.excerpt} aria-invalid={Boolean(errors.excerpt)} aria-describedby={errors.excerpt ? 'm-desc-error' : undefined} onChange={(event) => patch({ excerpt: event.target.value })} />
              <FieldError id="m-desc-error" message={errors.excerpt} />
            </div>
          </EditorCard>

          <EditorCard
            title="Audio"
            description="MP3. It is checked and transcoded to three bitrates before it can be published."
            action={
              draft.transcode === 'ready' &&
              canEdit && (
                <Label htmlFor="audio-file" className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--nff-button-outline-border)] px-3 nff-label-sm hover:bg-[var(--nff-button-ghost-bg-hover)]">
                  <RefreshCw aria-hidden="true" className="size-3.5" />
                  Replace
                </Label>
              )
            }
          >
            {draft.transcode !== 'ready' && !processing && (
              <label
                htmlFor="audio-file"
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  onFile(event.dataTransfer.files[0])
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center',
                  dragging ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]' : 'border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-subtle)]',
                )}
              >
                <UploadCloud aria-hidden="true" className="size-8 text-[var(--admin-text-muted)]" />
                <span className="nff-label-lg">Drop an MP3 here, or browse</span>
                <span className="nff-caption text-[var(--admin-text-muted)]">Demo tip: a file name containing “fail” simulates a failed transcode.</span>
              </label>
            )}
            <input id="audio-file" type="file" accept="audio/mpeg,.mp3" className="sr-only" disabled={!canEdit} onChange={(event) => onFile(event.target.files?.[0])} />

            {(processing || draft.transcode === 'failed') && (
              <ol aria-label="Processing steps" className="grid gap-2 sm:grid-cols-4">
                {STEPS.map((label, index) => {
                  const failed = draft.transcode === 'failed' && index === 2
                  const done = index < step
                  const active = index === step && !failed
                  return (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2 nff-caption',
                        failed ? 'border-nff-border-error bg-nff-bg-error-subtle text-nff-text-error' : done ? 'border-nff-border-success text-nff-text-success' : active ? 'border-[var(--admin-primary)]' : 'border-[var(--admin-border)] text-[var(--admin-text-muted)]',
                      )}
                    >
                      {failed ? (
                        <XCircle aria-hidden="true" className="size-4 shrink-0" />
                      ) : done ? (
                        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                      ) : active ? (
                        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border" />
                      )}
                      <span>
                        {label}
                        <span className="sr-only">{failed ? ', failed' : done ? ', done' : active ? ', in progress' : ', waiting'}</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
            {processing && fileName && <p className="nff-caption text-[var(--admin-text-muted)]">Processing {fileName}…</p>}

            {draft.transcode === 'failed' && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nff-border-error bg-nff-bg-error-subtle p-3">
                <p className="nff-body-sm text-nff-text-error">{failReason ?? 'Transcoding failed.'}</p>
                <Button size="sm" variant="outline" onClick={() => runPipeline(null, false)}>
                  Retry
                </Button>
              </div>
            )}

            {draft.transcode === 'ready' && (
              <div className="flex flex-col gap-2">
                {audioSrc ? (
                  <AudioPlayer src={audioSrc} durationSec={draft.durationSec || 600} />
                ) : (
                  <p className="nff-body-sm text-[var(--admin-text-muted)]">Audio is ready.</p>
                )}
                <p className="flex items-center gap-1.5 nff-caption text-nff-text-success">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  {TRANSCODE_META.ready.label}
                  {draft.durationSec ? ` · ${formatDuration(draft.durationSec)}` : ''}
                  {fileName ? ` · ${fileName}` : ''}
                </p>
              </div>
            )}
          </EditorCard>

          <EditorCard title="Artwork" description="Square, at least 1400 × 1400. Shown on cards and in the player.">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-36 items-center justify-center overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-nav-active-bg)]">
                {artwork ? <img src={artwork} alt="Artwork preview" className="size-full object-cover" /> : <ImagePlus aria-hidden="true" className="size-8 text-[var(--admin-text-muted)]" />}
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="artwork-file"
                  className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-[var(--nff-button-outline-border)] px-3 nff-label-md hover:bg-[var(--nff-button-ghost-bg-hover)]"
                >
                  <ImagePlus aria-hidden="true" className="size-4" />
                  {artwork ? 'Replace image' : 'Choose image'}
                  <input
                    id="artwork-file"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) setArtwork(URL.createObjectURL(file))
                    }}
                  />
                </Label>
                {artwork && (
                  <Button size="sm" variant="ghost" className="w-fit text-nff-text-error" onClick={() => setArtwork(null)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remove
                  </Button>
                )}
                <p className="nff-caption text-[var(--admin-text-muted)]">Not stored in this prototype.</p>
              </div>
            </div>
          </EditorCard>
        </div>

        <aside aria-label="Settings" className="flex flex-col gap-5">
          <EditorCard title="Access" description="Who can listen to this track.">
            <div role="radiogroup" aria-label="Access" className="flex flex-col gap-2">
              {[
                { value: true, icon: Unlock, label: 'Free preview', hint: 'Visitors can listen without an account.' },
                { value: false, icon: Lock, label: 'Locked', hint: 'Members only. Visitors are asked to sign up.' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={draft.preview === option.value}
                  disabled={!canEdit}
                  onClick={() => patch({ preview: option.value })}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left nff-focus-ring disabled:cursor-not-allowed disabled:bg-[var(--admin-surface-subtle)]',
                    draft.preview === option.value ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]' : 'border-[var(--admin-border)]',
                  )}
                >
                  <option.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="flex flex-col">
                    <span className="nff-label-md">{option.label}</span>
                    <span className="nff-caption text-[var(--admin-text-muted)]">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {isLiveStatus(draft.status) && !canPublish && (
              <p className="nff-caption text-[var(--admin-text-muted)]">This track is live: your change goes to review before visitors see it.</p>
            )}
          </EditorCard>

          <EditorCard title="Placement">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-stage">Stage</Label>
              <Select value={draft.stageId} onValueChange={(value) => patch({ stageId: value })}>
                <SelectTrigger id="m-stage" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((entry, index) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      Stage {index + 1} · {entry.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-cat">Category</Label>
              <Select value={draft.category} onValueChange={(value) => patch({ category: value as Category })}>
                <SelectTrigger id="m-cat" className="w-full data-[size=default]:h-11">
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
            <p className="flex justify-between nff-body-sm">
              <span className="text-[var(--admin-text-muted)]">Length</span>
              <span className="tabular-nums">{draft.durationSec ? formatDuration(draft.durationSec) : 'Set from the audio'}</span>
            </p>
          </EditorCard>

          <EditorCard title="Publishing checks">
            <ReadinessChecklist item={draft} />
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

      <ActionBar status={processing ? 'Audio is processing…' : dirty ? 'Unsaved changes' : 'All changes saved'}>
        <Button variant="outline" disabled={!canEdit || !dirty} onClick={() => persist()}>
          Save draft
        </Button>
        {(draft.status === 'draft' || draft.status === 'rejected' || draft.status === 'unpublished') && canSubmit && !canPublish && (
          <Button onClick={() => persist('in_review', 'Submitted for review.')}>Submit for review</Button>
        )}
        {(draft.status === 'draft' || draft.status === 'rejected') && canSubmit && canPublish && (
          <Button variant="outline" onClick={() => persist('in_review', 'Submitted for review.')}>
            Submit for review
          </Button>
        )}
        {canPublish && draft.status !== 'published' && (
          <Button disabled={draft.transcode !== 'ready'} title={draft.transcode !== 'ready' ? 'Audio must be ready first.' : undefined} onClick={() => persist('published', 'Published.')}>
            Publish
          </Button>
        )}
      </ActionBar>
    </div>
  )
}
