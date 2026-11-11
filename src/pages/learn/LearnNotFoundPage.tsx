import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { LEARN_HOME } from '@/services/learning/routes'

/** Unknown `/learn/*` URL: a not-found state inside the shell. */
export function LearnNotFoundPage() {
  return <AccessDeniedState reason="not-found" backTo={LEARN_HOME} backLabel="Back to Home" />
}
