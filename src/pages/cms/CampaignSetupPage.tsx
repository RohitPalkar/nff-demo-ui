import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { users } from '@/mocks/db'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { addCampaign, getTemplates, loadCampaigns } from '@/services/cms'

const STEPS = ['Details', 'Audience', 'Template', 'Schedule', 'Review'] as const

export function CampaignSetupPage() {
  const { can } = usePermissions()
  const { id = 'new' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const existing = loadCampaigns().find((entry) => entry.id === id)
  const templates = useQuery({ queryKey: ['cms', 'templates'], queryFn: () => getTemplates() })

  const [step, setStep] = useState(0)
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState('')
  const [template, setTemplate] = useState('tpl-1')
  const [mode, setMode] = useState<'nightly' | 'now'>('nightly')
  const [hour, setHour] = useState('07:00')
  const [error, setError] = useState<string | null>(null)
  const [testSent, setTestSent] = useState(false)

  const active = users.filter((entry) => entry.status === 'active').length
  const unsubscribed = 3
  const suppressed = 2
  const audience = Math.max(0, active - unsubscribed - suppressed)

  function next() {
    setError(null)
    if (step === 0 && name.trim().length < 3) {
      setError('Give the campaign a name of at least 3 characters.')
      return
    }
    if (step === 1 && audience === 0) {
      setError('The audience is empty. Adjust the eligibility rules.')
      return
    }
    setStep((value) => Math.min(value + 1, STEPS.length - 1))
  }

  function finish() {
    if (!existing) {
      const saved = attempt(() => addCampaign({
        id: `cmp-${Date.now()}`,
        name: name.trim(),
        state: mode === 'now' ? 'running' : 'scheduled',
        schedule: mode === 'now' ? 'Triggered now' : `Nightly · ${hour} local`,
        audience: 'Active practitioners',
        sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        failed: 0,
      }))
      if (!saved) return
    }
    void queryClient.invalidateQueries({ queryKey: ['cms', 'campaigns'] })
    toast.success(mode === 'now' ? 'Campaign triggered.' : 'Campaign scheduled.')
    navigate('/cms/campaigns')
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader title={existing ? `Edit ${existing.name}` : 'New campaign'} />

      <ol aria-label="Steps" className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={`rounded-full border px-3 py-1 nff-label-sm ${
              index === step
                ? 'border-primary bg-nff-bg-brand-subtle text-nff-text-brand'
                : index < step
                  ? 'text-foreground'
                  : 'text-muted-foreground'
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        {error && (
          <p role="alert" className="nff-body-sm text-nff-text-error">
            {error}
          </p>
        )}

        {step === 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-name">Campaign name</Label>
              <Input id="c-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="nff-body-md">
              Eligible: verified practitioners who have not unsubscribed.
            </p>
            <dl className="grid grid-cols-3 gap-3">
              <div>
                <dt className="nff-caption text-muted-foreground">Eligible now</dt>
                <dd className="nff-heading-h3">{audience}</dd>
              </div>
              <div>
                <dt className="nff-caption text-muted-foreground">Unsubscribed</dt>
                <dd className="nff-heading-h3">{unsubscribed}</dd>
              </div>
              <div>
                <dt className="nff-caption text-muted-foreground">Suppressed</dt>
                <dd className="nff-heading-h3">{suppressed}</dd>
              </div>
            </dl>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-template">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="c-template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(templates.data ?? []).map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name} · {entry.variantCount} variants
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="nff-caption text-muted-foreground">
              Variants are chosen by each practitioner&rsquo;s stage and activity.
            </p>
          </div>
        )}

        {step === 3 && (
          <>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'nightly' | 'now')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="m-nightly" value="nightly" />
                <Label htmlFor="m-nightly">Nightly at a local hour</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="m-now" value="now" />
                <Label htmlFor="m-now">Trigger now</Label>
              </div>
            </RadioGroup>
            {mode === 'nightly' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-hour">Local hour</Label>
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger id="c-hour" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['06:00', '07:00', '08:00', '18:00'].map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <dl className="grid gap-2 nff-body-sm">
              <div className="flex justify-between"><dt>Name</dt><dd>{name}</dd></div>
              <div className="flex justify-between"><dt>Audience</dt><dd>{audience} people</dd></div>
              <div className="flex justify-between">
                <dt>Template</dt>
                <dd>{templates.data?.find((entry) => entry.id === template)?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Schedule</dt>
                <dd>{mode === 'now' ? 'Now' : `Nightly at ${hour}`}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTestSent(true)
                  toast.success('Test email sent to you.')
                }}
              >
                Send test
              </Button>
              {testSent && (
                <span role="status" className="self-center nff-caption text-nff-text-success">
                  Test sent
                </span>
              )}
            </div>
          </>
        )}
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => (step === 0 ? navigate('/cms/campaigns') : setStep(step - 1))}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!(mode === 'now' ? can('campaigns.send') && can('campaigns.manage') : can('campaigns.manage'))}>
                {mode === 'now' ? 'Trigger now' : 'Schedule'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {mode === 'now' ? 'Send to everyone now?' : 'Schedule this campaign?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {audience} people will receive this email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={finish}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <Link to="/cms/campaigns" className="sr-only">
        Back to campaigns
      </Link>
    </div>
  )
}
