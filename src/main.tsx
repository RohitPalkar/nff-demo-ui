import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * Fade the boot splash out as soon as the first frame has painted. No minimum
 * delay: `is-done` also turns off pointer events, so the app is usable during
 * the 420ms fade. The splash exists only in index.html, so client-side route
 * changes never show it again.
 */
const SPLASH_FADE_MS = 420
/** Fallback for when frames are paused (background tab, occluded window). */
const SPLASH_FALLBACK_MS = 1000
const splash = document.getElementById('nff-splash')
if (splash && document.hidden) {
  // Opened in a background tab: nobody can see it, so skip the fade entirely.
  splash.remove()
} else if (splash) {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    splash.classList.add('is-done')
    window.setTimeout(() => splash.remove(), SPLASH_FADE_MS + 40)
  }
  // Normal path: two frames after render, i.e. once the app has painted.
  requestAnimationFrame(() => requestAnimationFrame(finish))
  window.setTimeout(finish, SPLASH_FALLBACK_MS)
}
