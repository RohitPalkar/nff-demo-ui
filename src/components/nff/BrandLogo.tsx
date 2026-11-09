import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.productName} home`}
      className={cn(
        'inline-flex items-center gap-3 rounded-md text-foreground nff-focus-ring',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-md bg-nff-bg-brand-default text-nff-text-on-brand"
      >
        <Sprout className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="nff-title-card">{BRAND.productName}</span>
          <span className="nff-caption text-muted-foreground">
            {BRAND.shortName} practice
          </span>
        </span>
      )}
    </Link>
  )
}
