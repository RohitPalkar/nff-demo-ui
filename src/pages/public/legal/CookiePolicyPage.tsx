import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { LegalPage, Placeholder, type LegalSection } from '@/components/nff/legal/LegalPage'
import { cn } from '@/lib/utils'

/*
 * Sample cookie policy for the demo. The essential rows list what this build
 * stores in the browser today; the production names come from the final
 * stack (Amazon Cognito session storage) and are marked as placeholders.
 * GA4 cookie names and default lifetimes are from Google's documentation
 * (support.google.com/analytics/answer/11397207).
 */

interface Row {
  name: string
  kind: 'Cookie' | 'Local storage'
  purpose: string
  duration: string
}

const GROUPS: Array<{ id: string; title: string; when: string; rows: Row[] }> = [
  {
    id: 'essential',
    title: 'Essential',
    when: 'Always on. Meadow cannot work without these, so they do not need your consent.',
    rows: [
      { name: 'nff.session', kind: 'Local storage', purpose: 'Keeps you signed in on this device', duration: 'Until you sign out' },
      { name: 'nff.otp-challenge', kind: 'Local storage', purpose: 'Holds the sign-in code request in progress', duration: '10 minutes, or until used' },
      { name: 'nff.otp-locks', kind: 'Local storage', purpose: 'Pauses sign-in after repeated wrong codes, to protect your account', duration: '15 minutes' },
      { name: 'nff.consent', kind: 'Local storage', purpose: 'Remembers your analytics choice', duration: 'Until you change it or clear site data' },
      { name: 'nff.consent.ledger', kind: 'Local storage', purpose: 'Keeps a record of the choices you made, so we can show what you agreed to', duration: 'Last 20 choices' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    when: 'Off until you switch them on. Never set for signed-in practitioners, and never set when your browser sends Global Privacy Control.',
    rows: [
      { name: '_ga', kind: 'Cookie', purpose: 'Google Analytics 4: tells visits from different browsers apart', duration: '2 years' },
      { name: '_ga_<ID>', kind: 'Cookie', purpose: 'Google Analytics 4: keeps track of the current visit', duration: '2 years' },
    ],
  },
]

function CookieTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[34rem] border-collapse text-left nff-body-sm">
        <caption className="sr-only">{title} cookies and storage</caption>
        <thead className="bg-nff-bg-surface-sunken">
          <tr>
            {['Name', 'Type', 'Purpose', 'How long'].map((heading) => (
              <th key={heading} scope="col" className="px-3 py-2.5 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t align-top">
              <th scope="row" className="px-3 py-2.5 font-mono text-[0.8125rem] font-medium">
                {row.name}
              </th>
              <td className="px-3 py-2.5">{row.kind}</td>
              <td className="px-3 py-2.5">{row.purpose}</td>
              <td className="px-3 py-2.5">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const sections: LegalSection[] = [
  {
    id: 'what',
    title: 'What cookies are',
    body: (
      <p>
        Cookies are small files a website saves in your browser. Local storage is a similar place in your browser where a
        site keeps small pieces of information. This policy uses “cookies” for both.
      </p>
    ),
  },
  ...GROUPS.map<LegalSection>((group) => ({
    id: group.id,
    title: `${group.title} cookies`,
    body: (
      <>
        <p>{group.when}</p>
        <CookieTable title={group.title} rows={group.rows} />
      </>
    ),
  })),
  {
    id: 'not-used',
    title: 'What we do not use',
    body: (
      <p>
        We do not use advertising cookies, social media trackers or cross-site tracking. We do not sell or share
        information collected through cookies. <Placeholder>Counsel to confirm before launch</Placeholder>
      </p>
    ),
  },
  {
    id: 'choices',
    title: 'Your choices',
    body: (
      <>
        <ul>
          <li>
            Turn analytics on or off at any time in <Link to="/cookie-preferences">Your privacy choices</Link>. Your choice
            is saved with the date and policy version.
          </li>
          <li>
            <strong className="font-medium">Global Privacy Control:</strong> if your browser sends this signal, we treat it
            as an opt-out and analytics stay off.
          </li>
          <li>
            You can also block or delete cookies in your browser settings. Blocking essential storage will sign you out and
            stop sign-in from working.
          </li>
        </ul>
        <Link to="/cookie-preferences" className={cn(buttonVariants(), 'w-fit')}>
          Open your privacy choices
        </Link>
      </>
    ),
  },
  {
    id: 'production',
    title: 'Notes for the live site',
    body: (
      <p>
        On the live site, sign-in uses Amazon Cognito, which stores its own session tokens:{' '}
        <Placeholder>final names and lifetimes from the production build</Placeholder>. Cloudflare may set a security cookie
        to filter harmful traffic: <Placeholder>confirm which Cloudflare features are enabled</Placeholder>.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: (
      <p>
        If we add a new type of cookie, we will update this page and ask again where consent is needed. Questions:{' '}
        <Placeholder>privacy contact email</Placeholder>. See also our <Link to="/privacy">privacy policy</Link>.
      </p>
    ),
  },
]

export function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      updated="2026-11-13"
      summary={
        <p>
          The cookies and browser storage Meadow uses, what each one is for, how long it lasts, and how to switch analytics
          on or off.
        </p>
      }
      sections={sections}
    />
  )
}
