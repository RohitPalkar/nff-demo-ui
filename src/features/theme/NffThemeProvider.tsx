import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function NffThemeProvider({ children }: { children: ReactNode }) {
  return (
    // Light mode only for the redesign. Dark tokens stay dormant in nff-tokens.css;
    // remove forcedTheme (and restore a toggle) to re-enable them later.
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
