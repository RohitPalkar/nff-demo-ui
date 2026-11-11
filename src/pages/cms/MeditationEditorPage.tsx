import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Circle, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ContentStatusChip, ReviewFeedback, RevisionNotice, PendingRevisionWarning } from '@/components/cms/CmsParts'
import { OwnershipPanel } from '@/components/cms/OwnershipPanel'
import { AudioPlayer } from '@/components/nff/AudioPlayer'
import { ErrorState } from '@/components/admin'
import { UnavailableState } from '@/components/nff/UnavailableState'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDuration } from '@/lib/format'
import { content, stages } from '@/mocks/db'
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
import type { Category, TranscodeStatus } from '@/types'
import { TRANSCODE_META } from './MeditationsListPage'

const STEPS = [
  'Uploaded',
  'Validating',
  'Transcoding 64 / 128 / 256',
  'Published to CDN',
] as const

const STEP_FOR: Record<TranscodeStatus, number> = {
  uploading: 0,
  validating: 1,
  transcoding: 2,
  ready: 4,
  failed: 2,
}

export function MeditationEditorPage() {
  const { id = '' } = useParams()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cms', 'item', id],
    queryFn: () => getCmsItem(id),
  })
  const [draft, setDraft] = useState<CmsItem | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [artwork, setArtwork] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [failReason, setFailReason] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (query.data) {
      setDraft(query.data)
      const base = content.find((entry) => entry.id === query.data!.id)
      if (base?.type === 'meditation') setAudioSrc(base.audioUrl)
    }
  }, [query.data])

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  function patch(next: Partial<CmsItem>) {
    setDraft((current) => (current ? { ...current, ...next } : current))
  }

  function runPipeline(file: File | null, forceFail: boolean) {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    setFailReason(null)
    patch({ transcode: 'uploading' })
    const schedule = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, ms))

    schedule(900, () => patch({ transcode: 'validating' }))
    schedule(2100, () => patch({ transcode: 'transcoding' }))
    schedule(3600, () => {
      if (forceFail) {
        patch({ transcode: 'failed' })
        setFailReason('The audio stream could not be decoded at 128 kbps.')
      } else {
        patch({ transcode: 'ready', durationSec: draft?.durationSec || 600 })
        if (file) {
          const url = URL.createObjectURL(file)
          setAudioSrc(url)
          const probe = new Audio(url)
          probe.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(probe.duration) && probe.duration > 0) {
              patch({ durationSec: Math.round(probe.duration) })
            }
          })
        }
      }
    })
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') {
      toast.error('Upload an MP3 file.')
      return
    }
    runPipeline(file, /fail/i.test(file.name))
  }

  function persist(status?: CmsItem['status'], message = 'Saved.') {
    if (!draft) return false
    const found = validateItem(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error('Fix the highlighted fields first.')
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

  if (query.isPending || (!draft && query.data)) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading meditation</span>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load this meditation"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
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

  const meta = TRANSCODE_META[draft.transcode]
  const step = STEP_FOR[draft.transcode]
  const canPublish = can('content.publish')
  const canSubmit = can('content.submit')

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9">
          <Link to="/cms/meditations" aria-label="Back to meditations">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <h1 className="nff-heading-h3 min-w-0 flex-1 truncate">
          {draft.title || 'Untitled meditation'}
        </h1>
        <ContentStatusChip status={draft.status} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/cms/preview/meditation/${draft.id}`)}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="audio" className="flex flex-col gap-4">
            <h2 id="audio" className="nff-heading-h4">
              Audio
            </h2>
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
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center ${
                dragging ? 'border-primary bg-nff-bg-brand-subtle' : 'border-nff-border-strong'
              }`}
            >
              <UploadCloud aria-hidden="true" className="size-8 text-muted-foreground" />
              <span className="nff-label-lg">Drop an MP3 here or browse</span>
              <span className="nff-caption text-muted-foreground">
                Tip: a file name containing &ldquo;fail&rdquo; simulates a failed transcode.
              </span>
              <input
                id="audio-file"
                type="file"
                accept="audio/mpeg,.mp3"
                className="sr-only"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>

            <ol aria-label="Processing steps" className="flex flex-col gap-2">
              {STEPS.map((label, index) => {
                const failed = draft.transcode === 'failed' && index === 2
                const done = index < step
                const active = index === step && !failed && draft.transcode !== 'ready'
                return (
                  <li key={label} className="flex items-center gap-2 nff-body-sm">
                    {failed ? (
                      <XCircle aria-hidden="true" className="size-4 text-nff-text-error" />
                    ) : done ? (
                      <CheckCircle2 aria-hidden="true" className="size-4 text-nff-text-success" />
                    ) : active ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin text-nff-text-brand" />
                    ) : (
                      <Circle aria-hidden="true" className="size-4 text-muted-foreground" />
                    )}
                    <span className={done || active ? 'text-foreground' : 'text-muted-foreground'}>
                      {label}
                    </span>
                  </li>
                )
              })}
            </ol>

            {draft.transcode === 'failed' && (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 rounded-xl border border-nff-border-error bg-nff-bg-error-subtle p-4"
              >
                <p className="nff-body-sm text-nff-text-error">
                  {failReason ?? 'Transcoding failed.'}
                </p>
                <Button size="sm" variant="outline" onClick={() => runPipeline(null, false)}>
                  Retry
                </Button>
              </div>
            )}

            {draft.transcode === 'ready' && audioSrc && (
              <AudioPlayer
                src={audioSrc}
                durationSec={draft.durationSec || 600}
              />
            )}
            <p className="nff-caption text-muted-foreground">
              Status: {meta.label}
              {draft.durationSec ? ` · ${formatDuration(draft.durationSec)}` : ''}
            </p>
          </section>

          <section aria-labelledby="artwork" className="flex flex-col gap-3">
            <h2 id="artwork" className="nff-heading-h4">
              Artwork
            </h2>
            <div className="flex items-center gap-4">
              <div
                aria-label="Square artwork preview"
                className="flex size-28 items-center justify-center overflow-hidden rounded-lg border bg-nff-bg-brand-subtle"
              >
                {artwork ? (
                  <img src={artwork} alt="" className="size-full object-cover" />
                ) : (
                  <span className="nff-caption text-muted-foreground">1:1</span>
                )}
              </div>
              <Label
                htmlFor="artwork-file"
                className="cursor-pointer rounded-md border px-3 py-2 nff-label-md"
              >
                Choose image
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
            </div>
          </section>
        </div>

        <aside
          aria-label="Metadata"
          className="flex flex-col gap-4 rounded-xl border bg-card p-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              value={draft.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => {
                const title = event.target.value
                patch({
                  title,
                  slug:
                    draft.slug ||
                    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
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
            <Label htmlFor="m-slug">Slug</Label>
            <Input
              id="m-slug"
              value={draft.slug}
              aria-invalid={Boolean(errors.slug)}
              onChange={(event) => patch({ slug: event.target.value })}
            />
            {errors.slug && (
              <p role="alert" className="nff-body-sm text-nff-text-error">
                {errors.slug}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <Textarea
              id="m-desc"
              rows={3}
              value={draft.excerpt}
              aria-invalid={Boolean(errors.excerpt)}
              onChange={(event) => patch({ excerpt: event.target.value })}
            />
            {errors.excerpt && (
              <p role="alert" className="nff-body-sm text-nff-text-error">
                {errors.excerpt}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-stage">Stage</Label>
            <Select value={draft.stageId} onValueChange={(value) => patch({ stageId: value })}>
              <SelectTrigger id="m-stage" className="w-full">
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
            <Label htmlFor="m-cat">Category</Label>
            <Select
              value={draft.category}
              onValueChange={(value) => patch({ category: value as Category })}
            >
              <SelectTrigger id="m-cat" className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['foundations', 'understand', 'contemplate', 'explore'].map((entry) => (
                  <SelectItem key={entry} value={entry} className="capitalize">
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-duration">Duration (auto)</Label>
            <Input
              id="m-duration"
              readOnly
              disabled
              value={draft.durationSec ? formatDuration(draft.durationSec) : '—'}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="m-preview">Free preview track</Label>
            <Switch
              id="m-preview"
              checked={draft.preview}
              onCheckedChange={(checked) => patch({ preview: checked })}
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
        <Button variant="outline" disabled={!can('content.edit')} onClick={() => persist()}>
          Save draft
        </Button>
        {(draft.status === 'draft' || draft.status === 'rejected') && canSubmit && (
          <Button
            variant="outline"
            onClick={() => persist('in_review', 'Submitted for review.')}
          >
            Submit for review
          </Button>
        )}
        {canPublish && draft.status !== 'published' && (
          <Button
            disabled={draft.transcode !== 'ready'}
            onClick={() => persist('published', 'Published.')}
          >
            Publish
          </Button>
        )}
      </div>
    </div>
  )
}
