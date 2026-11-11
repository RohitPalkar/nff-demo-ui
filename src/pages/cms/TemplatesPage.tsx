import { useQuery } from '@tanstack/react-query'
import { Mail, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/admin'
import { ErrorState } from '@/components/admin'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/features/auth/usePermissions'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { getTemplates } from '@/services/cms'

const TONE: Record<string, StatusTone> = {
  active: 'success',
  draft: 'neutral',
  archived: 'warning',
}

export function TemplatesPage() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['cms', 'templates'], queryFn: () => getTemplates() })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading templates</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load templates"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Email templates"
        action={
          <Button className="h-10" disabled={!can('campaigns.manage')} onClick={() => navigate('/cms/templates/new')}>
            <Plus aria-hidden="true" className="size-4" />
            New template
          </Button>
        }
      />
      {query.data.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Create a template to use in a campaign."
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Stages covered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/cms/templates/${template.id}`}
                      className="text-nff-text-link hover:underline"
                    >
                      {template.name}
                    </Link>
                  </TableCell>
                  <TableCell>{template.variantCount}</TableCell>
                  <TableCell>{template.stagesCovered}</TableCell>
                  <TableCell>
                    <StatusChip tone={TONE[template.status] ?? 'neutral'} icon={Mail}>
                      <span className="capitalize">{template.status}</span>
                    </StatusChip>
                  </TableCell>
                  <TableCell>{formatDate(template.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/cms/templates/${template.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!can('campaigns.manage')}
                        onClick={() => toast.success('Template duplicated.')}
                      >
                        Duplicate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
