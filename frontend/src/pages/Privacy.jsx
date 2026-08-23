import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-black text-white">{title}</h2>
    <div className="space-y-2 text-sm leading-6 text-white/55">{children}</div>
  </section>
);

const Privacy = () => (
  <main className="min-h-screen bg-background px-4 py-10 text-white">
    <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Privacy &amp; Data
        </p>
        <h1 className="mt-2 text-3xl font-black">PayMatrix Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/40">Effective 23 August 2026</p>
      </header>

      <Section title="What PayMatrix is">
        <p>
          PayMatrix coordinates shared expenses and records user-confirmed settlements. It is not a
          bank, wallet, payment processor, or proof that a bank transfer occurred.
        </p>
      </Section>
      <Section title="Data we store">
        <p>
          Account data can include your name, email address, Firebase user ID, Google profile photo,
          friend relationships, group membership, UPI ID, notification tokens and preferences.
        </p>
        <p>
          Financial records can include expense titles, amounts, categories, dates, participants,
          split details, settlement records, notes, audit history, and personal log entries.
        </p>
      </Section>
      <Section title="How data is used">
        <p>
          We use this data to authenticate you, calculate balances, synchronize groups across
          devices, show member identity cards, export records, prevent abuse, deliver opted-in
          notifications, and keep an immutable history of financial changes.
        </p>
      </Section>
      <Section title="Receipt scanning and AI">
        <p>
          When you choose Scan Bill, the selected receipt image is sent through PayMatrix server
          code to Google Gemini for extraction. AI output is untrusted and must be reviewed before
          saving. PayMatrix does not intentionally persist the original receipt image in Firestore,
          but Google&apos;s processing is governed by the applicable Google service terms.
        </p>
      </Section>
      <Section title="Service providers and sharing">
        <p>
          PayMatrix uses Google Firebase for authentication, database storage and optional
          notifications; Google Gemini for user-requested receipt extraction; and the configured web
          hosting/serverless provider for the web application. Data is not sold and the app contains
          no advertising SDK.
        </p>
        <p>
          Your safe display name and profile photo are visible to authenticated users who share a
          group with you, even when you are not friends. Private profile details are not exposed
          through that identity card.
        </p>
      </Section>
      <Section title="Retention and deletion">
        <p>
          You can export your data and delete your account. Deletion removes the sign-in account and
          immediately replaces identifying profile data with “Deleted user”. Shared financial
          records and UID references are retained when deletion would corrupt another member&apos;s
          ledger. A non-personal deletion receipt is retained for 30 days.
        </p>
      </Section>
      <Section title="Security and choices">
        <p>
          Traffic uses HTTPS in production, access is restricted by Firebase Authentication and
          Firestore rules, and Android backups are disabled. No system can guarantee that an attack
          is impossible. Keep your device and Google account secure, review transaction edits, and
          report suspected abuse.
        </p>
        <p>
          Push notifications are optional and requested only after you enable them. You may also
          revoke notification permission in Android settings.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          For privacy or security questions, open a private-contact request through the project
          owner using the{' '}
          <a
            className="text-primary underline"
            href="https://github.com/Marshmellow31/PayMatrix/issues"
            target="_blank"
            rel="noreferrer"
          >
            PayMatrix support issue tracker
          </a>
          . Do not include financial or authentication secrets in a public issue.
        </p>
      </Section>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <Link
          to="/delete-account"
          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400"
        >
          Delete account
        </Link>
        <Link to="/" className="rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-white/70">
          Return to PayMatrix
        </Link>
      </div>
    </article>
  </main>
);

export default Privacy;
