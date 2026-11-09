import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DetailBreadcrumb,
  type DetailTrailItem,
} from '@/components/nff/DetailBreadcrumb'
import { Button } from '@/components/ui/button'

interface UnavailableStateProps {
  icon: LucideIcon
  title: string
  description: string
  trail: DetailTrailItem[]
  backTo: string
  backLabel: string
}

export function UnavailableState({
  icon: Icon,
  title,
  description,
  trail,
  backTo,
  backLabel,
}: UnavailableStateProps) {
  return (
    <div>
      <div className="nff-content pt-6 md:pt-8">
        <DetailBreadcrumb trail={trail} current="Not available" />
      </div>
      <div className="nff-content py-16 md:py-24">
        <div className="nff-reading mx-auto flex flex-col items-start gap-5">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-nff-bg-muted text-nff-icon-secondary"
          >
            <Icon className="size-6" />
          </span>
          <p className="nff-overline text-nff-text-brand">Not available</p>
          <h1 className="nff-heading-h1 text-foreground">{title}</h1>
          <p className="nff-body-lg text-muted-foreground">{description}</p>
          <Button asChild variant="outline" className="h-11">
            <Link to={backTo}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
