import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Headphones, Lock, Monitor, Pencil, Play, Smartphone, Tablet, Unlock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmationDialog, ErrorState, InlineNotice, LoadingState } from '@/components/admin'
import { ContentStatusChip, EditorCard, ReadinessChecklist, TRANSCODE_META, displayTitle } from '@/components/cms/CmsParts'
import { MarkdownPreview } from '@/components/cms/MarkdownPreview'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { checksFor, getCmsItem, loadStages, setCmsStatus } from '@/services/cms'

const DEVICES = {
  desktop: { label: 'Desktop', width: '100%', icon: Monitor },
  tablet: { label: 'Tablet', width: '768px', icon: Tablet },
  mobile: { label: 'Mobile', width: '390px', icon: Smartphone },
} as const

/**
 * How an item will look to a visitor or a practitioner, on three widths.
 * The frame fills the working area; the side panel says what the chosen
 * audience gets and whether the item is ready, so nothing is left blank.
 */
export function ContentPreviewPage() {
  const { type = '', id = '' } = useParams()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['cms', 'item', id], queryFn: () => getCmsItem(id) })
  const [device, setDevice] = useState<keyof typeof DEVICES>('desktop')
  const [audience, setAudience] = useState<'visitor' | 'practitioner'>('visitor')
  const [publishing, setPublishing] = useState(false)

  const back = `/cms/${type === 'meditation' ? 'meditations' : 'explorations'}/${id}`

  if (query.isPending) return <LoadingState label="Loading preview" rows={6} />
  if (query.isError) {
    return <ErrorState title="We could not load the preview" description="Check your connection and try again." onRetry={() => void query.refetch()} />
  }
  const item = query.data
  if (!item) {
    return (
      <UnavailableState
        icon={ArrowLeft}
        title="We could not find that item"
        description="It may have been removed."
        trail={[{ label: 'CMS', to: '/cms' }]}
        backTo="/cms"
        backLabel="Back to CMS"
      />
    )
  }

  const stages = loadStages()
  const stageIndex = stages.findIndex((entry) => entry.id === item.stageId)
  const stage = stages[stageIndex]
  const stageLabel = stage ? `Stage ${stageIndex + 1} · ${stage.title}` : 'Not placed in a stage'
  const blocks = item.body.split(/\n{2,}/).filter(Boolean)
  const isVisitor = audience === 'visitor'
  const gated = item.type === 'exploration' ? isVisitor && blocks.length > 1 : isVisitor && !item.preview
  const canPublish = can('content.publish') && can('content.approve')
  const ready = Object.values(checksFor(item)).every(Boolean)
  const narrow = device !== 'desktop'

  return (
    <div className="flex flex-col gap-4">
      <div role="toolbar" aria-label="Preview options" className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={back}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to edit
          </Link>
        </Button>
        <span aria-hidden="true" className="hidden h-6 w-px bg-[var(--admin-border)] sm:block" />
        <div className="flex gap-2" role="group" aria-label="Device">
          {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((key) => {
            const Icon = DEVICES[key].icon
            return (
              <Button key={key} size="sm" variant={device === key ? 'default' : 'ghost'} aria-pressed={device === key} onClick={() => setDevice(key)}>
                <Icon aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{DEVICES[key].label}</span>
                <span className="sr-only sm:hidden">{DEVICES[key].label}</span>
              </Button>
            )
          })}
        </div>
        <span aria-hidden="true" className="hidden h-6 w-px bg-[var(--admin-border)] sm:block" />
        <div className="flex gap-2" role="group" aria-label="Audience">
          {(['visitor', 'practitioner'] as const).map((key) => (
            <Button key={key} size="sm" variant={audience === key ? 'default' : 'ghost'} aria-pressed={audience === key} className="capitalize" onClick={() => setAudience(key)}>
              {key}
            </Button>
          ))}
        </div>
        {canPublish && item.status !== 'published' && (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!ready}
            title={ready ? undefined : 'Fix the failed checks first.'}
            onClick={() => setPublishing(true)}
          >
            Publish
          </Button>
        )}
        <ConfirmationDialog
          open={publishing}
          onOpenChange={setPublishing}
          title={`Publish ${displayTitle(item)}?`}
          description={`It goes live straight away for ${item.type === 'meditation' && !item.preview ? 'members' : 'visitors and practitioners'}. You can unpublish it later from the ${item.type === 'meditation' ? 'Meditations' : 'Explorations'} list.`}
          confirmLabel="Publish now"
          onConfirm={() => {
            setPublishing(false)
            if (!attempt(() => setCmsStatus(item.id, 'published'))) return
            void queryClient.invalidateQueries({ queryKey: ['cms'] })
            toast.success(`${displayTitle(item)} is published.`)
          }}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[70dvh] justify-center overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-nff-bg-surface-sunken p-3 sm:p-6">
          <article
            style={{ width: DEVICES[device].width, maxWidth: '100%' }}
            className={cn('flex flex-col overflow-hidden bg-background shadow-nff-2', narrow ? 'rounded-2xl border' : 'rounded-lg border')}
            aria-label={`${DEVICES[device].label} preview for a ${audience}`}
          >
            <div className={cn('flex items-end bg-nff-bg-brand-subtle', narrow ? 'h-40' : 'h-56')}>
              <div className={cn('mx-auto w-full max-w-3xl', narrow ? 'px-5 pb-4' : 'px-10 pb-6')}>
                <p className="nff-overline capitalize text-nff-text-brand">{item.category}</p>
              </div>
            </div>
            <div className={cn('mx-auto flex w-full max-w-3xl flex-col gap-4', narrow ? 'px-5 py-6' : 'px-10 py-10')}>
              <h1 className={narrow ? 'nff-heading-h2' : 'nff-heading-h1'}>{displayTitle(item)}</h1>
              <p className="nff-body-sm text-muted-foreground">
                {stageLabel}
                {item.type === 'meditation' && item.durationSec ? ` · ${formatDuration(item.durationSec)}` : ''}
                {item.type === 'exploration' && blocks.length ? ` · ${Math.max(1, Math.round(item.body.split(/\s+/).length / 220))} min read` : ''}
              </p>
              {item.excerpt && <p className="nff-reading-lead text-nff-text-secondary">{item.excerpt}</p>}

              {item.type === 'meditation' ? (
                item.transcode !== 'ready' ? (
                  <div className="rounded-lg border border-nff-border-warning bg-nff-bg-warning-subtle p-4 nff-body-sm text-nff-text-warning">
                    Missing asset: audio is {TRANSCODE_META[item.transcode].label.toLowerCase()}. The player appears once it is ready.
                  </div>
                ) : gated ? (
                  <div className="flex flex-col items-start gap-3 rounded-lg border bg-nff-bg-brand-subtle p-5">
                    <Lock aria-hidden="true" className="size-5 text-nff-text-brand" />
                    <p className="nff-label-lg">Members only</p>
                    <p className="nff-body-sm text-nff-text-secondary">Create a free account to listen to this meditation.</p>
                    <span className="rounded-md bg-primary px-4 py-2 nff-label-md text-primary-foreground">Sign up free</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play aria-hidden="true" className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="nff-label-md">{isVisitor ? 'Free preview' : 'Full track'}</span>
                      <span aria-hidden="true" className="h-1.5 rounded-full bg-nff-bg-muted">
                        <span className="block h-full w-1/4 rounded-full bg-primary" />
                      </span>
                    </div>
                    <span className="nff-caption tabular-nums text-muted-foreground">{item.durationSec ? formatDuration(item.durationSec) : '—'}</span>
                  </div>
                )
              ) : (
                <>
                  <MarkdownPreview body={item.body} limit={gated ? 1 : undefined} />
                  {gated && (
                    <div className="flex flex-col items-start gap-2 rounded-lg border bg-nff-bg-brand-subtle p-5">
                      <p className="nff-label-lg">Keep reading</p>
                      <p className="nff-body-sm text-nff-text-secondary">Sign up free to read the full lesson.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        </div>

        <aside aria-label="About this preview" className="flex flex-col gap-4">
          {item.status !== 'published' && (
            <InlineNotice tone="warning">Not published: visitors and practitioners cannot see this yet.</InlineNotice>
          )}
          <EditorCard title="Status">
            <dl className="flex flex-col gap-2 nff-body-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--admin-text-muted)]">Publishing</dt>
                <dd>
                  <ContentStatusChip status={item.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--admin-text-muted)]">Placement</dt>
                <dd className="text-right">{stageLabel}</dd>
              </div>
              {item.type === 'meditation' && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[var(--admin-text-muted)]">Access</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    {item.preview ? <Unlock aria-hidden="true" className="size-4" /> : <Lock aria-hidden="true" className="size-4" />}
                    {item.preview ? 'Free preview' : 'Locked to members'}
                  </dd>
                </div>
              )}
            </dl>
          </EditorCard>
          <EditorCard title={`What a ${audience} gets`}>
            <p className="flex items-start gap-2 nff-body-sm">
              <Headphones aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--admin-text-muted)]" />
              {item.type === 'exploration'
                ? isVisitor
                  ? 'The summary and the first section, then an invitation to sign up.'
                  : 'The whole exploration.'
                : isVisitor
                  ? item.preview
                    ? 'The free preview player, without an account.'
                    : 'A sign-up prompt: the track is locked to members.'
                  : 'The full track and their own progress.'}
            </p>
          </EditorCard>
          <EditorCard title="Publishing checks">
            <ReadinessChecklist item={item} />
          </EditorCard>
          {can('content.edit') && (
            <Button asChild variant="outline">
              <Link to={back}>
                <Pencil aria-hidden="true" className="size-4" />
                Edit this {item.type}
              </Link>
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
