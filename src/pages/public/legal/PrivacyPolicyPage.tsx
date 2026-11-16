import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LegalPage, Placeholder, type LegalSection } from '@/components/nff/legal/LegalPage'

/*
 * Sample privacy policy for the demo. Its structure follows the CCPA/CPRA
 * regulations (Cal. Code Regs. tit. 11, §7011): categories collected, sources,
 * purposes, disclosures, sale/sharing, retention, rights and how to use them,
 * GPC, and contact. Facts come from SOW v1.3 (email + one-time code accounts,
 * GA4 for visitors only after consent, daily email, export and deletion).
 * Anything the client must decide is a <Placeholder>.
 */

const COLLECTED: Array<[string, string, string, string]> = [
  ['Identifiers', 'Name and email address', 'You, when you create an account', 'Account, sign-in and the daily email'],
  ['Account settings', 'Time zone and email preferences', 'You, in your profile', 'Sending the daily email at the right time'],
  [
    'Activity in Meadow',
    'Explorations read, meditations played, listening position, completed lessons and stage, sign-in dates',
    'Your use of Meadow while signed in',
    'Saving your progress, and an engagement measure our team uses to support practitioners',
  ],
  [
    'Website analytics',
    'Pages viewed, preview plays, device and browser type, approximate location from IP address',
    'Google Analytics 4, only for visitors who are not signed in, and only after you allow it',
    'Understanding how the public site is used',
  ],
  ['Email events', 'Delivery, opens, bounces, complaints and unsubscribes', 'Our email provider', 'Delivering the daily email and honouring unsubscribes'],
]

const RETENTION: Array<[string, ReactNode]> = [
  ['Account and profile', 'While your account is open; erased when you delete it'],
  ['Progress and activity', 'While your account is open; erased when you delete it'],
  ['Sign-in codes', 'Up to 10 minutes, or until used'],
  ['Consent choices', 'For as long as we need to show what you chose'],
  ['Analytics', <><Placeholder>retention period set in Google Analytics</Placeholder></>],
  ['Backups', <><Placeholder>backup retention period</Placeholder>, then overwritten</>],
]

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          Meadow is run by <Placeholder>NFF legal entity name</Placeholder>, <Placeholder>postal address</Placeholder> (“we”,
          “us”). This policy explains what personal information we collect when you use the Meadow website, why we collect
          it, and the choices and rights you have.
        </p>
        <p>
          It covers the public site, practitioner accounts and the daily email. It does not cover other websites we link to.
        </p>
      </>
    ),
  },
  {
    id: 'notice-at-collection',
    title: 'What we collect and why',
    body: (
      <>
        <p>We collect only what Meadow needs to work. We do not ask for a password, payment details or government IDs.</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] border-collapse text-left nff-body-sm">
            <caption className="sr-only">Personal information we collect, where it comes from and why</caption>
            <thead className="bg-nff-bg-surface-sunken">
              <tr>
                {['Category', 'Examples', 'Source', 'Purpose'].map((heading) => (
                  <th key={heading} scope="col" className="px-3 py-2.5 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLLECTED.map(([category, examples, source, purpose]) => (
                <tr key={category} className="border-t align-top">
                  <th scope="row" className="px-3 py-2.5 font-medium">
                    {category}
                  </th>
                  <td className="px-3 py-2.5">{examples}</td>
                  <td className="px-3 py-2.5">{source}</td>
                  <td className="px-3 py-2.5">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do not knowingly collect sensitive personal information as defined by California law. Meadow is a practice
          and learning service, not a medical service, and we do not ask about your health.{' '}
          <Placeholder>Counsel to confirm whether state consumer health data laws, such as Washington’s My Health My Data Act, apply and, if so, add the required notice and consent</Placeholder>
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    body: (
      <ul>
        <li>To create your account and sign you in with a one-time code sent to your email.</li>
        <li>To show the library, save your listening position and track your progress through the stages.</li>
        <li>To send the daily email, if you have not unsubscribed.</li>
        <li>To keep Meadow secure, for example by pausing sign-in after repeated wrong codes.</li>
        <li>To understand, with your permission, how visitors use the public site, so we can improve it.</li>
        <li>To meet legal obligations and respond to lawful requests.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We share personal information only with service providers that run Meadow for us, under contracts that limit how they may use it:</p>
        <ul>
          <li>Hosting and storage: Amazon Web Services, in <Placeholder>AWS region</Placeholder>.</li>
          <li>Content delivery and security: Cloudflare.</li>
          <li>Sign-in: Amazon Cognito.</li>
          <li>Email delivery: <Placeholder>email provider</Placeholder>.</li>
          <li>Website analytics, only with your permission: Google Analytics 4.</li>
        </ul>
        <p>
          <strong className="font-medium">We do not sell your personal information</strong>, and we do not share it for
          cross-context behavioural advertising. <Placeholder>Counsel to confirm</Placeholder>
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and your privacy choices',
    body: (
      <>
        <p>
          Essential storage keeps you signed in and remembers your choices. Analytics cookies are off until you switch them
          on. If your browser sends a <strong className="font-medium">Global Privacy Control</strong> signal, we treat it as
          a request to opt out, and analytics stay off.
        </p>
        <p>
          Read the <Link to="/cookies">cookie policy</Link> for the full list, or change your settings at any time in{' '}
          <Link to="/cookie-preferences">Your privacy choices</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <ul>
        {RETENTION.map(([what, how]) => (
          <li key={what}>
            <strong className="font-medium">{what}:</strong> {how}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Depending on where you live, including California, Colorado, Connecticut, Virginia and other US states, you have
          the right to:
        </p>
        <ul>
          <li><strong className="font-medium">Know and access</strong> the personal information we hold about you, and get a copy.</li>
          <li><strong className="font-medium">Correct</strong> information that is wrong.</li>
          <li><strong className="font-medium">Delete</strong> your information.</li>
          <li><strong className="font-medium">Opt out</strong> of the sale or sharing of personal information, and of targeted advertising. We do neither.</li>
          <li><strong className="font-medium">Not be treated differently</strong> for using any of these rights.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'exercise-rights',
    title: 'How to use your rights',
    body: (
      <>
        <ul>
          <li>
            <strong className="font-medium">Signed in:</strong> download your data or delete your account under{' '}
            <Link to="/account/privacy">Account › Privacy &amp; security</Link>. Deletion is permanent.
          </li>
          <li>
            <strong className="font-medium">By email:</strong> write to <Placeholder>privacy contact email</Placeholder>.
            We confirm the request within 10 business days and answer within 45 days.
          </li>
        </ul>
        <p>
          To protect your account, we confirm a request by sending a one-time code to the email on the account. You may use
          an authorised agent; we will ask for proof that you gave them permission. If we turn down a request, you can
          appeal by replying to our answer.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        Meadow is not directed to children under 13, and we do not knowingly collect their personal information. Accounts
        are for people aged <Placeholder>minimum age, 13 or 18</Placeholder> and over. If you believe a child has given us
        information, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security and where data is stored',
    body: (
      <p>
        Data is encrypted in transit and at rest, and staff access follows their role. Meadow’s data is stored in{' '}
        <Placeholder>country / AWS region</Placeholder>, so your information may be processed outside your state or country.
        No system is perfectly secure; if a breach affects you, we will tell you as the law requires.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We review this policy at least once a year. If we make a significant change, we will update the date above and tell
        signed-in practitioners by email before it takes effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions or requests: <Placeholder>privacy contact email</Placeholder>, or write to{' '}
        <Placeholder>NFF legal entity name and postal address</Placeholder>.
      </p>
    ),
  },
]

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2026-11-13"
      summary={
        <p>
          What we collect, why, who helps us run Meadow, and how to see, correct or delete your information. In short: we
          collect little, we do not sell it, and analytics stay off unless you allow them.
        </p>
      }
      sections={sections}
    />
  )
}
