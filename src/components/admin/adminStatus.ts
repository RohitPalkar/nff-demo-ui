import {
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  FileEdit,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

/**
 * Admin status vocabulary. Every status is a word plus an icon plus a tone:
 * colour is never the only signal. Add a status here, not in a page.
 */
export type AdminTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export const ADMIN_STATUS = {
  draft: { label: 'Draft', tone: 'neutral', icon: FileEdit },
  in_review: { label: 'In review', tone: 'warning', icon: Eye },
  published: { label: 'Published', tone: 'success', icon: CheckCircle2 },
  scheduled: { label: 'Scheduled', tone: 'info', icon: Clock },
  rejected: { label: 'Rejected', tone: 'error', icon: XCircle },
  unpublished: { label: 'Unpublished', tone: 'neutral', icon: Ban },
  deactivated: { label: 'Deactivated', tone: 'neutral', icon: UserX },
  unassigned: { label: 'Unassigned', tone: 'neutral', icon: Circle },
} as const satisfies Record<string, { label: string; tone: AdminTone; icon: LucideIcon }>

export type AdminStatus = keyof typeof ADMIN_STATUS
