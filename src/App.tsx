import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { VideoMiniPlayer } from '@/components/nff/VideoMiniPlayer'

export default function App() {
  return (
    <Providers>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
      />
      <VideoMiniPlayer onExpand={(to) => void router.navigate(to)} />
    </Providers>
  )
}
