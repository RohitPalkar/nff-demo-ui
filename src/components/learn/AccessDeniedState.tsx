import { FileQuestion, Lock } from 'lucide-react'
import { UnavailableState } from '@/components/nff/UnavailableState'
import type { AccessReason } from '@/services/learning/access'
import { LEARN_HOME, LEARN_MY_LEARNING } from '@/services/learning/routes'

const TRAIL = [{ label: 'Learn', to: LEARN_HOME }]

const COPY: Partial<Record<AccessReason, { title: string; description: string }>> = {
  'locked-module': {
    title: 'This stage is not open yet',
    description: 'Finish the stage before it to unlock this one.',
  },
  'not-assigned': {
    title: 'This has not been assigned to you',
    description: 'Ask your administrator if you think you should have access.',
  },
  'not-permitted': {
    title: 'This is restricted',
    description: 'You do not have permission to open this.',
  },
  unpublished: {
    title: 'This is not available yet',
    description: 'It has not been published.',
  },
  'not-found': {
    title: 'We could not find that',
    description: 'It may have moved or no longer exist.',
  },
}

interface AccessDeniedStateProps {
  reason?: AccessReason
  /** Where "back" goes. Defaults to My Learning. */
  backTo?: string
  backLabel?: string
  /** What a locked unit is called: Meadow Journey has stages, other paths modules. */
  unit?: 'stage' | 'module'
}

/** In-app state for closed or missing learning content. Never leaves the shell. */
export function AccessDeniedState({
  reason = 'not-permitted',
  backTo = LEARN_MY_LEARNING,
  backLabel = 'Back to My Learning',
  unit = 'stage',
}: AccessDeniedStateProps) {
  const base = COPY[reason] ?? COPY['not-permitted']!
  const copy =
    reason === 'locked-module' && unit === 'module'
      ? { title: 'This module is not open yet', description: 'Finish the module before it to unlock this one.' }
      : base
  return (
    <UnavailableState
      icon={reason === 'not-found' ? FileQuestion : Lock}
      title={copy.title}
      description={copy.description}
      trail={TRAIL}
      backTo={backTo}
      backLabel={backLabel}
    />
  )
}
