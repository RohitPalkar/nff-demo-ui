import { Download, Loader2, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FLAGS } from '@/config/flags'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import {
  buildExportJson,
  cancelDeletion,
  getExportStatus,
  requestDeletion,
  requestExport,
  type DeletionState,
  type ExportStatus,
} from '@/services/account'

interface LayoutContext {
  deletion: DeletionState | null
  onDeletionChange: (value: DeletionState | null) => void
}

export function PrivacyPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { deletion, onDeletionChange } = useOutletContext<LayoutContext>()
  const [status, setStatus] = useState<ExportStatus>(() =>
    user ? getExportStatus(user.id) : { state: 'none' },
  )
  const [confirmText, setConfirmText] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user || status.state !== 'pending') return
    const id = window.setInterval(() => {
      setStatus(getExportStatus(user.id))
    }, 1000)
    return () => window.clearInterval(id)
  }, [user, status.state])

  async function download() {
    if (!user) return
    const json = await buildExportJson(user.id)
    const url = URL.createObjectURL(
      new Blob([json], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'nff-data-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function confirmDeletion() {
    if (!user) return
    setDeleting(true)
    try {
      const state = await requestDeletion(user.id)
      onDeletionChange(state)
      toast.success('Your account is scheduled for deletion.')
    } catch {
      toast.error('We could not schedule deletion. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = confirmText === 'DELETE' && acknowledged

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="security-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="security-heading" className="nff-heading-h3">
            Sign-in and security
          </h2>
          <p className="nff-body-md text-muted-foreground">
            How you sign in to Meadow.
          </p>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
          <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <dt className="nff-label-md text-muted-foreground">Sign-in email</dt>
            <dd className="min-w-0 break-words nff-body-md">{user?.email}</dd>
            <dt className="nff-label-md text-muted-foreground">Email address</dt>
            <dd className="nff-body-md">{user?.verified ? 'Verified' : 'Not verified yet'}</dd>
          </dl>
          <p className="nff-body-sm text-muted-foreground">
            Changing your password and managing signed-in devices are not available in this demo.
          </p>
          <Button
            variant="outline"
            className="h-11 w-fit"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </Button>
        </div>
      </section>

      <section aria-labelledby="export-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="export-heading" className="nff-heading-h3">
            Export my data
          </h2>
          <p className="nff-body-md text-muted-foreground">
            Download a JSON file with your profile, progress and email
            preferences.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
          {status.state === 'none' && (
            <Button
              className="h-11 w-fit"
              onClick={() => user && setStatus(requestExport(user.id))}
            >
              Request export
            </Button>
          )}
          {status.state === 'pending' && (
            <p role="status" className="inline-flex items-center gap-2 nff-body-md">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Preparing your export…
            </p>
          )}
          {status.state === 'ready' && (
            <>
              <p role="status" className="nff-body-md text-nff-text-success">
                Your export is ready. It expires on{' '}
                {formatDate(new Date(status.expiresAt).toISOString())}.
              </p>
              <div className="flex gap-3">
                <Button className="h-11" onClick={() => void download()}>
                  <Download aria-hidden="true" className="size-4" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => user && setStatus(requestExport(user.id))}
                >
                  Request again
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="delete-heading"
        className="flex flex-col gap-4 rounded-lg border border-nff-border-error p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id="delete-heading" className="nff-heading-h3 text-nff-text-error">
            Delete account
          </h2>
          <p className="nff-body-md text-muted-foreground">
            Deleting your account erases your profile, progress and email data.
            You have {FLAGS.deletionGraceDays} days to change your mind before
            it is permanent.
          </p>
          <p className="nff-body-sm text-muted-foreground">
            In this demo, scheduling is saved in this browser and nothing is erased.
          </p>
        </div>

        {deletion ? (
          <div className="flex flex-col items-start gap-3">
            <p role="status" className="nff-body-md text-nff-text-warning">
              Deletion is scheduled for {formatDate(deletion.scheduledFor)}.
            </p>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                if (!user) return
                cancelDeletion(user.id)
                onDeletionChange(null)
                toast.success('Deletion cancelled.')
              }}
            >
              Cancel deletion
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                autoComplete="off"
                onChange={(event) => setConfirmText(event.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="ack-delete"
                checked={acknowledged}
                onCheckedChange={(value) => setAcknowledged(value === true)}
              />
              <label htmlFor="ack-delete" className="nff-body-sm">
                I understand my progress and data will be erased.
              </label>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-11 w-fit"
                  disabled={!canDelete || deleting}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account will be scheduled for deletion in{' '}
                    {FLAGS.deletionGraceDays} days. You can cancel any time
                    before then.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void confirmDeletion().then(() => {
                        setConfirmText('')
                        setAcknowledged(false)
                      })
                    }}
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </section>
    </div>
  )
}
