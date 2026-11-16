import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "nff-target inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-[length:var(--nff-type-button-size)] leading-[var(--nff-type-button-line-height)] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-[var(--nff-duration-fast)] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-[var(--nff-button-disabled-opacity)] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--nff-button-primary-bg-hover)] active:bg-[var(--nff-button-primary-bg-active)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[var(--nff-button-destructive-bg-hover)] dark:bg-destructive/60",
        outline:
          "border border-[var(--nff-button-outline-border)] bg-[var(--nff-button-outline-bg)] text-foreground hover:bg-[var(--nff-button-ghost-bg-hover)] active:bg-[var(--nff-button-ghost-bg-active)] dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--nff-button-secondary-bg-hover)] active:bg-[var(--nff-button-secondary-bg-active)]",
        ghost:
          "hover:bg-[var(--nff-button-ghost-bg-hover)] hover:text-accent-foreground active:bg-[var(--nff-button-ghost-bg-active)] dark:hover:bg-accent/50",
        link: "text-[var(--nff-button-tertiary-fg)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { Button, buttonVariants }
