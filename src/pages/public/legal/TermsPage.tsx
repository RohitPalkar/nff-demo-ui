import { Link } from 'react-router-dom'
import { LegalPage, Placeholder, type LegalSection } from '@/components/nff/legal/LegalPage'

/*
 * Sample terms of use for the demo. Sections follow common US practice for a
 * free wellbeing content service: eligibility, account, not medical advice
 * (with US crisis lines), licence, acceptable use, email, IP, termination,
 * disclaimers, liability, disputes and changes. Facts come from SOW v1.3
 * (email + one-time code, one account per email, streaming only, daily email,
 * account deletion). Choices for counsel are <Placeholder>s.
 */

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreeing to these terms',
    body: (
      <p>
        These terms are an agreement between you and <Placeholder>NFF legal entity name</Placeholder> (“we”, “us”) for the
        use of Meadow. By creating an account or using the site, you agree to them and to our{' '}
        <Link to="/privacy">privacy policy</Link>. If you do not agree, please do not use Meadow.
      </p>
    ),
  },
  {
    id: 'not-medical-advice',
    title: 'Meadow is not medical care',
    body: (
      <>
        <p>
          Meadow offers educational essays and guided meditations. It is not therapy, medical care or a crisis service, and
          it does not replace advice from a qualified professional. Talk to a doctor before starting any practice if you
          have concerns about your health.
        </p>
        <p className="rounded-lg border-l-4 border-[var(--nff-clay-500)] bg-[var(--nff-clay-50)] px-4 py-3">
          <strong className="font-medium">If you are in crisis or thinking about harming yourself</strong>, call or text{' '}
          <a href="tel:988">988</a> to reach the 988 Suicide &amp; Crisis Lifeline in the US, or call{' '}
          <a href="tel:911">911</a> in an emergency.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use Meadow',
    body: (
      <p>
        You must be at least <Placeholder>minimum age, 13 or 18</Placeholder> to create an account. One account is allowed
        per email address.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <ul>
        <li>You sign in with your email address and a one-time code we send to it. There is no password.</li>
        <li>Keep access to your email secure: anyone who can read it can sign in as you.</li>
        <li>Give accurate details and keep them up to date in your profile.</li>
        <li>Tell us straight away at <Placeholder>support contact email</Placeholder> if you think someone else has used your account.</li>
      </ul>
    ),
  },
  {
    id: 'licence',
    title: 'Using Meadow’s content',
    body: (
      <>
        <p>
          We give you a personal, non-exclusive, non-transferable licence to read and stream Meadow’s content for your own,
          non-commercial use. Meditations are streamed only; they are not offered for download.
        </p>
        <p>
          All content, including essays, audio, artwork and the Meadow name and logo, belongs to us or our licensors and is
          protected by copyright and trademark law.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Please do not:</p>
        <ul>
          <li>copy, record, download, resell or redistribute the content;</li>
          <li>share your account or sign-in codes;</li>
          <li>try to get around access rules, probe for weaknesses or overload the service;</li>
          <li>use bots or scrapers to collect content or data;</li>
          <li>use Meadow in a way that breaks the law or harms others.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'emails',
    title: 'The daily email',
    body: (
      <p>
        Registered practitioners receive one daily practice email. Every email has an unsubscribe link, and you can change
        this any time in <Link to="/account/email">email preferences</Link>. We may still send messages about your account,
        such as sign-in codes.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Closing your account',
    body: (
      <p>
        You can delete your account at any time under <Link to="/account/privacy">Account › Privacy &amp; security</Link>;
        deletion is permanent. We may suspend or close an account that breaks these terms, and we will tell you why unless
        the law prevents it.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        Meadow is provided “as is” and “as available”. To the extent the law allows, we make no warranties, express or
        implied, including that the service will be uninterrupted or error-free, or that any practice will lead to a
        particular result.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits on our liability',
    body: (
      <p>
        To the extent the law allows, we are not liable for indirect, incidental or consequential losses arising from your
        use of Meadow. Our total liability is limited to <Placeholder>liability cap</Placeholder>. Some states do not allow
        these limits, so they may not apply to you.
      </p>
    ),
  },
  {
    id: 'disputes',
    title: 'Disputes and governing law',
    body: (
      <p>
        These terms are governed by the laws of <Placeholder>governing state or country</Placeholder>. Please contact us
        first so we can try to resolve any concern informally.{' '}
        <Placeholder>Counsel to choose the dispute process, for example courts or arbitration, and any class action waiver</Placeholder>
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms. If a change is significant, we will tell signed-in practitioners by email at least{' '}
        <Placeholder>notice period</Placeholder> before it takes effect. Continuing to use Meadow after that means you
        accept the new terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        <Placeholder>support contact email</Placeholder> · <Placeholder>NFF legal entity name and postal address</Placeholder>
      </p>
    ),
  },
]

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="2026-11-13"
      summary={
        <p>
          The agreement for using Meadow: who can join, how your account works, how you may use the content, and what to
          do if something goes wrong.
        </p>
      }
      sections={sections}
    />
  )
}
