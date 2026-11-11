import { AccessDeniedState } from '@/components/learn/AccessDeniedState'

/** `/learn/access-denied`: the destination for a generic "no access" state. */
export function AccessDeniedPage() {
  return <AccessDeniedState reason="not-permitted" />
}
