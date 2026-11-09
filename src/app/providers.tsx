import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { NffThemeProvider } from '@/features/theme/NffThemeProvider'
import { DevScenarioPanel } from '@/components/nff/DevScenarioPanel'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <NffThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={250}>
            {children}
            <Toaster position="bottom-right" closeButton />
            <DevScenarioPanel />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NffThemeProvider>
  )
}
