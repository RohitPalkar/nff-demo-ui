import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '@/components/nff/ErrorState'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDuration } from '@/lib/format'
import { stages } from '@/mocks/db'
import { getCmsItem, setCmsStatus } from '@/services/cms'

const DEVICES = {
  desktop: { label: 'Desktop', width: '100%', icon: Monitor },
  tablet: { label: 'Tablet', width: '768px', icon: Tablet },
  mobile: { label: 'Mobile', width: '375px', icon: Smartphone },
} as const

export function ContentPreviewPage() {
  const { type = '', id = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cms', 'item', id],
    queryFn: () => getCmsItem(id),
  })
  const [device, setDevice] = useState<keyof typeof DEVICES>('desktop')
  const [audience, setAudience] = useState<'visitor' | 'practitioner'>('visitor')

  const back = `/cms/${type === 'meditation' ? 'meditations' : 'explorations'}/${id}`

  if (query.isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" aria-busy="true" />
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load the preview"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
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

  const stage = stages.find((entry) => entry.id === item.stageId)
  const paragraphs = item.body.split(/\n{2,}/).filter(Boolean)
  const shown =
    item.type === 'exploration' && audience === 'visitor'
      ? paragraphs.slice(0, 1)
      : paragraphs
  const canPublish = user?.role === 'admin'

  return (
    <div className="flex flex-col gap-4">
      <div
        role="toolbar"
        aria-label="Preview options"
        className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
      >
        <Button asChild variant="ghost" size="sm">
          <Link to={back}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to edit
          </Link>
        </Button>
        <div className="flex gap-1" role="group" aria-label="Device">
          {(Object.keys(DEVICES) as Array<keyof typeof DEVICES>).map((key) => {
            const Icon = DEVICES[key].icon
            return (
              <Button
                key={key}
                size="sm"
                variant={device === key ? 'default' : 'outline'}
                aria-pressed={device === key}
                onClick={() => setDevice(key)}
              >
                <Icon aria-hidden="true" className="size-4" />
                {DEVICES[key].label}
              </Button>
            )
          })}
        </div>
        <div className="flex gap-1" role="group" aria-label="Audience">
          {(['visitor', 'practitioner'] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={audience === key ? 'default' : 'outline'}
              aria-pressed={audience === key}
              className="capitalize"
              onClick={() => setAudience(key)}
            >
              {key}
            </Button>
          ))}
        </div>
        {canPublish && item.status !== 'published' && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              setCmsStatus(item.id, 'published')
              void queryClient.invalidateQueries({ queryKey: ['cms'] })
              toast.success('Published.')
            }}
          >
            Publish
          </Button>
        )}
      </div>

      {item.status !== 'published' && (
        <p role="status" className="rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-3 nff-body-sm text-nff-text-warning">
          Unpublished: this item is not visible to the public yet.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-nff-bg-surface-sunken p-4">
        <div
          style={{ width: DEVICES[device].width, maxWidth: '100%' }}
          className="mx-auto rounded-xl border bg-background p-6 shadow-nff-2"
        >
          <p className="nff-overline capitalize text-nff-text-brand">{item.category}</p>
          <h1 className="nff-heading-h1 mt-2">{item.title || 'Untitled'}</h1>
          <p className="nff-body-sm mt-2 text-muted-foreground">
            {stage ? `Stage ${stage.number} · ${stage.title}` : 'No stage'}
            {item.type === 'meditation' && item.durationSec
              ? ` · ${formatDuration(item.durationSec)}`
              : ''}
          </p>
          <p className="nff-reading-lead mt-6 text-nff-text-secondary">{item.excerpt}</p>
          {item.type === 'meditation' ? (
            <div className="mt-6 rounded-xl border bg-card p-4 nff-body-sm">
              {item.transcode === 'ready'
                ? audience === 'practitioner' || item.preview
                  ? 'Audio player appears here.'
                  : 'Sign-up gate appears here for visitors.'
                : 'Missing asset: audio is not ready yet.'}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {shown.map((paragraph) => (
                <p key={paragraph} className="nff-reading-body text-nff-text-secondary">
                  {paragraph}
                </p>
              ))}
              {audience === 'visitor' && paragraphs.length > 1 && (
                <p className="rounded-xl border bg-nff-bg-brand-subtle p-4 nff-body-sm">
                  Sign up free to read the full lesson.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="nff-caption text-muted-foreground">
        Placement: {stage ? `Stage ${stage.number} · ${stage.title}` : 'not placed in a stage yet'}.
      </p>
    </div>
  )
}
