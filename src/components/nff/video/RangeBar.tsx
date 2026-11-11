import type { CSSProperties } from 'react'
import { clamp } from '@/features/video/videoState'
import { cn } from '@/lib/utils'

interface RangeBarProps {
  label: string
  value: number
  max: number
  step?: number
  /** Spoken value, e.g. "1 minute 5 seconds". Defaults to the number. */
  valueText?: string
  disabled?: boolean
  onChange: (value: number) => void
  className?: string
}

/**
 * Native range input styled as a thin filled bar, used for seek and volume.
 * Native keeps arrow, Home, End and PageUp/PageDown keyboard support and the
 * slider role for free.
 */
export function RangeBar({
  label,
  value,
  max,
  step = 0.1,
  valueText,
  disabled,
  onChange,
  className,
}: RangeBarProps) {
  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(to right, var(--color-nff-text-on-brand) ${percent}%, rgb(255 255 255 / 0.28) ${percent}%)`,
  }
  return (
    <input
      type="range"
      min={0}
      max={max > 0 ? max : 0}
      step={step}
      value={clamp(value, 0, max > 0 ? max : 0)}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
      style={style}
      className={cn(
        'h-5 w-full cursor-pointer appearance-none rounded-full bg-clip-content bg-origin-content py-[7px] disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        '[&::-webkit-slider-thumb]:-mt-0 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm',
        '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
        className,
      )}
    />
  )
}
