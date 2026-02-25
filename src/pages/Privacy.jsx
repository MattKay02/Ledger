import { useNavigate } from 'react-router-dom'

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-white font-semibold text-base mb-3">{title}</h2>
    <div className="text-muted text-sm leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted hover:text-white text-sm transition-colors mb-8"
        >
          ← Back
        </button>

        <h1 className="text-white text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted text-sm mb-10">
          Effective date: 1 February 2026 &middot; Last updated: 25 February 2026
        </p>

        <Section title="1. Who we are">
          <p>
            Ledger is a personal business finance dashboard. For the purposes of this policy,{' '}
            <strong className="text-white">Ledger</strong> acts as the data controller for the
            personal data you provide when using this application.
          </p>
          <p>
            If you have questions about how your data is used, contact us at{' '}
            <a
              href="mailto:mattykay2002@gmail.com"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              mattykay2002@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="2. Data we collect">
          <p>We collect and process the following categories of personal data:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              <strong className="text-white">Account data:</strong> Email address, display name,
              and authentication provider identity (for Google or Apple sign-in).
            </li>
            <li>
              <strong className="text-white">Financial records:</strong> Income entries, expense
              entries, and budget targets you create within the app. Each record stores the original
              currency, the original amount, and the GBP-converted equivalent.
            </li>
            <li>
              <strong className="text-white">Session data:</strong> An authentication token issued
              by Supabase, stored in your browser&apos;s local storage to keep you signed in.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong className="text-white">not</strong> collect payment card information,
            government identifiers, or sensitive personal data as defined by Article 9 of the
            UK GDPR.
          </p>
        </Section>

        <Section title="3. How we use your data">
          <p>Your data is used solely to provide the Ledger service:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Authenticating you and securing your account.</li>
            <li>Storing and displaying your financial records (income, expenses, budgets).</li>
            <li>Converting foreign-currency amounts to GBP for display purposes.</li>
            <li>Generating reports and CSV exports of your own data on request.</li>
          </ul>
          <p className="mt-2">
            We do not use your data for advertising, profiling, or automated decision-making.
          </p>
        </Section>

        <Section title="4. Lawful basis for processing">
          <p>
            Under the UK GDPR, our lawful basis for processing your personal data is{' '}
            <strong className="text-white">contract</strong> (Article 6(1)(b)) — processing is
            necessary to provide the service you have signed up for. Session management relies on
            our <strong className="text-white">legitimate interest</strong> (Article 6(1)(f)) in
            keeping the application secure.
          </p>
        </Section>

        <Section title="5. Third-party processors">
          <p>
            We share data with the following sub-processors solely to operate the service:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong className="text-white">Supabase (Supabase Inc., USA)</strong> — provides
              authentication and the PostgreSQL database that stores all your records. Supabase is
              SOC 2 Type II certified. See their{' '}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                privacy policy
              </a>.
            </li>
            <li>
              <strong className="text-white">ExchangeRate-API (ExchangeRate-API Ltd, UK)</strong>{' '}
              — provides live foreign exchange rates. Only the currency pair is sent; no personal
              data is transmitted. See their{' '}
              <a
                href="https://www.exchangerate-api.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                privacy policy
              </a>.
            </li>
            <li>
              <strong className="text-white">Vercel (Vercel Inc., USA)</strong> — hosts the
              frontend application. Vercel may process request metadata (IP address, browser
              agent) in server logs. See their{' '}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                privacy policy
              </a>.
            </li>
          </ul>
        </Section>

        <Section title="6. Data retention">
          <p>
            Your account data and all financial records are retained for as long as your account
            remains active. When you delete your account (via Settings → Data → Delete Account),
            all records are permanently and immediately erased from our database. Session tokens
            expire automatically after inactivity.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>Under the UK GDPR you have the following rights:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>
              <strong className="text-white">Access:</strong> You can view all data stored in the
              app at any time.
            </li>
            <li>
              <strong className="text-white">Portability:</strong> Export all your financial data
              as CSV files via Settings → Data → Export All Data.
            </li>
            <li>
              <strong className="text-white">Rectification:</strong> Edit any record directly
              within the app.
            </li>
            <li>
              <strong className="text-white">Erasure:</strong> Delete your account and all
              associated data via Settings → Data → Delete Account.
            </li>
            <li>
              <strong className="text-white">Objection / Restriction:</strong> Contact us to
              request that we restrict or cease processing your data.
            </li>
          </ul>
          <p className="mt-2">
            You also have the right to lodge a complaint with the{' '}
            <a
              href="https://ico.org.uk/make-a-complaint/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Information Commissioner&apos;s Office (ICO)
            </a>{' '}
            if you believe your data has been mishandled.
          </p>
        </Section>

        <Section title="8. Cookies and local storage">
          <p>
            Ledger does not set tracking or advertising cookies. The Supabase authentication
            client stores a session token in your browser&apos;s{' '}
            <strong className="text-white">local storage</strong> to keep you signed in between
            sessions. This token contains no personally identifiable information beyond a secure
            user identifier, and is automatically cleared when you sign out.
          </p>
        </Section>

        <Section title="9. International data transfers">
          <p>
            Supabase and Vercel are US-based companies. Transfers of personal data to the USA are
            covered by Standard Contractual Clauses (SCCs) or equivalent mechanisms as required
            by UK data protection law.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. The effective date at the top of this
            page will always reflect the latest version. Continued use of Ledger after an update
            constitutes acceptance of the revised policy.
          </p>
        </Section>

        <p className="text-muted text-xs border-t border-surface-border pt-6 mt-2">
          This policy is provided for informational purposes and does not constitute legal advice.
        </p>

      </div>
    </div>
  )
}
