import { Link } from 'react-router-dom'
import { LegalPage, Placeholder, type LegalSection } from '@/components/nff/legal/LegalPage'

/*
 * Sample accessibility statement for the demo. Structure follows WCAG 2.2
 * and common accessibility statement requirements. Facts come from the
 * demo build (semantic HTML, keyboard focus, colour contrast, reduced
 * motion, screen reader labels). Items counsel must finalise are
 * <Placeholder>.
 */

const sections: LegalSection[] = [
  {
    id: 'commitment',
    title: 'Our commitment',
    body: (
      <>
        <p>
          We want Meadow to be usable by as many people as possible. That means:
        </p>
        <ul>
          <li>Writing clear, consistent language and giving every interactive element a visible focus state.</li>
          <li>Building with semantic HTML so screen readers can navigate by headings, landmarks and lists.</li>
          <li>Choosing colour combinations that meet WCAG 2.2 AA contrast ratios (4.5:1 for text, 3:1 for UI).</li>
          <li>Respecting <strong className="font-medium">prefers-reduced-motion</strong> and removing non-essential animation when it is set.</li>
          <li>Providing text alternatives for images and non-text content.</li>
          <li>Ensuring everything works with a keyboard alone — no mouse or touch required.</li>
        </ul>
        <p>
          Meadow is a work in progress. We test with axe-core in CI and run manual keyboard and screen-reader checks
          before each release. <Placeholder>Schedule and results of the next formal WCAG 2.2 AA audit</Placeholder>.
        </p>
      </>
    ),
  },
  {
    id: 'known-limitations',
    title: 'Known limitations',
    body: (
      <>
        <p>The following areas do not yet meet our target and are on the backlog:</p>
        <ul>
          <li>
            <strong className="font-medium">Meditation player:</strong> the waveform scrubber is keyboard-operable but the
            drag handle does not yet expose its position to all screen readers. A native <code>{'<input type="range">'}</code>
            replacement is planned.
          </li>
          <li>
            <strong className="font-medium">Charts and progress graphics:</strong> some analytics charts rely on colour alone.
            We are adding patterns, labels and data tables. <Placeholder>Target date</Placeholder>.
          </li>
          <li>
            <strong className="font-medium">Third-party content:</strong> embedded audio and any future third-party widgets
            may not fully conform. We will evaluate each integration.
          </li>
        </ul>
        <p>
          If you encounter a barrier not listed here, please tell us — we treat every report as a bug.
        </p>
      </>
    ),
  },
  {
    id: 'keyboard-and-screen-readers',
    title: 'Keyboard navigation and screen readers',
    body: (
      <>
        <h3 className="nff-label-md text-foreground">Global shortcuts</h3>
        <ul>
          <li><kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Tab</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Shift+Tab</kbd> — move forward / backward through focusable elements.</li>
          <li><kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Enter</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Space</kbd> — activate buttons and links.</li>
          <li><kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Escape</kbd> — close dialogs, drawers and the mobile menu.</li>
          <li><kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Arrow keys</kbd> — navigate inside menus, tabs, sliders and the meditation player.</li>
        </ul>
        <h3 className="nff-label-md text-foreground">Skip links</h3>
        <p>Press <kbd className="px-1.5 py-0.5 rounded bg-nff-bg-surface-sunken border font-mono text-xs">Tab</kbd> immediately after the page loads to reveal a <strong className="font-medium">Skip to main content</strong> link. It jumps past the header and navigation to the page&apos;s <code>{'<main>'}</code> landmark.</p>
        <h3 className="nff-label-md text-foreground">Landmarks and headings</h3>
        <p>Every page uses a proper heading hierarchy (<code>h1</code> &rarr; <code>h2</code> &rarr; <code>h3</code>) and HTML landmarks
        (<code>{'<header>'}</code>, <code>{'<nav>'}</code>, <code>{'<main>'}</code>, <code>{'<aside>'}</code>, <code>{'<footer>'}</code>). Screen-reader users can navigate by headings (Rotor / H) or landmarks (Rotor / D).</p>
        <h3 className="nff-label-md text-foreground">Live regions</h3>
        <p>Dynamic updates (toast notifications, player state changes, consent changes) use <code>aria-live="polite"</code> or
        <code>aria-live="assertive"</code> so they are announced without moving focus.</p>
      </>
    ),
  },
  {
    id: 'visual-design',
    title: 'Visual design and motion',
    body: (
      <>
        <h3 className="nff-label-md text-foreground">Colour contrast</h3>
        <p>All text and meaningful UI elements meet WCAG 2.2 AA (4.5:1 for body text, 3:1 for large text and UI components).
        The palette uses CSS custom properties so a high-contrast mode can be added by swapping tokens.</p>
        <h3 className="nff-label-md text-foreground">Text sizing and spacing</h3>
        <p>Base font size is 1 rem (16 px). Text scales with the browser zoom and respects the user&apos;s minimum font size.
        Line height is &ge; 1.5; letter and word spacing can be increased via browser settings without breaking layout.</p>
        <h3 className="nff-label-md text-foreground">Reduced motion</h3>
        <p>We wrap non-essential transitions in <code>@media (prefers-reduced-motion: reduce)</code> and disable them when
        the setting is on. The meditation player&apos;s breathing animation pauses automatically. <Placeholder>Confirm that the
        Lottie/Canvas animations in the player also respect reduced-motion</Placeholder>.</p>
        <h3 className="nff-label-md text-foreground">Focus indicators</h3>
        <p>Every interactive element has a visible focus ring (3 px, offset 2 px, brand colour) that meets the 3:1 contrast
        requirement against adjacent colours. Focus is never removed without a replacement.</p>
      </>
    ),
  },
  {
    id: 'media',
    title: 'Audio, video and alternatives',
    body: (
      <>
        <p>Meditations are audio-only. Each meditation has:</p>
        <ul>
          <li>A transcript available from the player&apos;s &ldquo;Transcript&rdquo; button (or <code>/meditations/:slug?transcript=1</code>).</li>
          <li>Chapter markers so you can jump to sections.</li>
          <li>Playback speed control (0.75&times;, 1&times;, 1.25&times;, 1.5&times;, 2&times;).</li>
        </ul>
        <p>Explorations (essays) are text. Images in essays have descriptive <code>alt</code> written by the content team.
        Decorative images use empty alt.</p>
        <p><Placeholder>If video is added later: captions, audio description and a transcript will be required</Placeholder>.</p>
      </>
    ),
  },
  {
    id: 'forms-and-errors',
    title: 'Forms, validation and errors',
    body: (
      <>
        <p>Sign-in uses a one-time code sent to email — no password field. The code input:</p>
        <ul>
          <li>Has <code>autocomplete="one-time-code"</code> so password managers can fill it.</li>
          <li>Announces errors via <code>aria-live="assertive"</code> and links the error message to the input with
          <code>aria-describedby</code>.</li>
          <li>Shows a visible error state (red border + icon) in addition to colour.</li>
        </ul>
        <p>All form fields have associated <code>{'<label>'}</code> elements. Required fields are marked in the label,
        not only with an asterisk.</p>
      </>
    ),
  },
  {
    id: 'testing',
    title: 'How we test',
    body: (
      <ul>
        <li><strong className="font-medium">Automated:</strong> axe-core in CI on every pull request (fail on violations).</li>
        <li><strong className="font-medium">Keyboard-only:</strong> every new page and component is tabbed through end-to-end before merge.</li>
        <li><strong className="font-medium">Screen readers:</strong> spot-checked with NVDA (Windows) and VoiceOver (macOS/iOS).</li>
        <li><strong className="font-medium">Zoom:</strong> tested at 200 % and 400 % zoom; no loss of content or function.</li>
        <li><strong className="font-medium">Colour blindness:</strong> checked with simulators (protanopia, deuteranopia, tritanopia).</li>
      </ul>
    ),
  },
  {
    id: 'feedback',
    title: 'Feedback and contact',
    body: (
      <>
        <p>
          If you find an accessibility barrier, or if you have suggestions, please contact us:
        </p>
        <ul>
          <li>Email: <Placeholder>accessibility contact email</Placeholder></li>
          <li>Form: <Link to="/contact">Contact page</Link> (choose &ldquo;Accessibility&rdquo;)</li>
        </ul>
        <p>
          We aim to acknowledge reports within <Placeholder>acknowledgement SLA, e.g. 5 business days</Placeholder> and
          give a timeline for a fix. If you are not satisfied with our response, you can escalate to
          <Placeholder>regulator or ombudsman, if applicable</Placeholder>.
        </p>
      </>
    ),
  },
  {
    id: 'updates',
    title: 'Updates to this statement',
    body: (
      <p>
        We review this statement at least once a year and after any significant change to the product. The date above
        will be updated when we do. <Placeholder>Link to changelog or archive of previous versions</Placeholder>.
      </p>
    ),
  },
]

export function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      updated="2026-11-18"
      summary={
        <p>
          How Meadow works for keyboard-only, screen-reader and reduced-motion users; known gaps; and how to report a barrier.
        </p>
      }
      sections={sections}
    />
  )
}