import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-[var(--nff-input-bg)] hover:border-[var(--nff-input-border-hover)] px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-nff-text-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-[var(--nff-input-bg-disabled)] disabled:opacity-60 aria-invalid:border-[var(--nff-input-border-error)] aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
})

export { Textarea }
