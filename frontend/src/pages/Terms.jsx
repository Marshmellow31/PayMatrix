import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-black text-white">{title}</h2>
    <div className="space-y-2 text-sm leading-6 text-white/55 font-inter">{children}</div>
  </section>
);

const Terms = () => (
  <main className="min-h-screen bg-[#0e0e0e] px-4 py-10 text-white selection:bg-white/10">
    <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-10 backdrop-blur-xl">
      <header className="border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary font-manrope">
          Legal Agreement
        </p>
        <h1 className="mt-2 text-3xl font-black font-manrope">PayMatrix Terms of Service</h1>
        <p className="mt-2 text-sm text-white/40 font-inter">Effective 31 August 2026</p>
      </header>

      <Section title="1. Nature of the Service">
        <p>
          PayMatrix is an expense-tracking, balance-calculation, and debt-simplification application
          designed to help groups of people keep track of shared costs and peer-to-peer settlements.
        </p>
        <p className="font-semibold text-white/80">
          Important Non-Custodial Disclaimer: PayMatrix is not a bank, non-banking financial company
          (NBFC), payment gateway, escrow service, or money transmitter. PayMatrix does not hold,
          process, transfer, custody, or intermediate user funds.
        </p>
      </Section>

      <Section title="2. Account Registration & Authentication">
        <p>
          You must authenticate through Firebase Authentication using Google Sign-In or a verified
          email address and password. paymatrix uses your name, email address, and optional provider
          profile photo solely to create your account, identify you to members of groups you join,
          and secure your sessions.
        </p>
        <p>
          Firebase handles passwords; paymatrix does not receive or store them. You are responsible
          for maintaining the security of your device, linked account, and email inbox. You agree to
          notify us immediately of unauthorized access or a security breach.
        </p>
      </Section>

      <Section title="3. Group Expenses & Debt Simplification">
        <p>
          Users may create groups, add expenses, and specify split configurations (equal, exact,
          percentage, shares, itemized). You agree to record accurate financial numbers and notes.
        </p>
        <p>
          Our debt simplification algorithm calculates mathematical offsets between participants to
          minimize the total number of transactions needed to settle up. These calculations are
          informational suggestions based on the data entered by group members.
        </p>
      </Section>

      <Section title="4. Peer-to-Peer UPI Settlements">
        <p>
          PayMatrix allows users to generate standard UPI QR codes (
          <code className="text-xs text-primary font-mono">upi://pay</code>) to facilitate
          peer-to-peer settlement via third-party banking and payment applications (such as Google
          Pay, PhonePe, Paytm, BHIM, or other UPI-enabled apps).
        </p>
        <p>
          When you tap &quot;Mark Paid&quot; or confirm a settlement in PayMatrix, you are declaring
          in the shared ledger that you have verified a successful bank transfer in your own UPI
          application or bank statement. Recording a settlement in PayMatrix does{' '}
          <strong>not</strong> initiate, execute, or prove an actual bank transfer.
        </p>
      </Section>

      <Section title="5. AI Receipt Scanning (OCR)">
        <p>
          When you use the Scan Bill feature, receipt images are sent securely to Google Cloud AI
          (Gemini) for ephemeral optical character extraction. AI-extracted items and amounts are
          automated estimates and must be verified by you before saving.
        </p>
        <p>
          Receipt images are processed ephemerally and are not permanently retained in our Firestore
          database.
        </p>
      </Section>

      <Section title="6. User Conduct & Fair Use">
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1 pl-2 text-white/60">
          <li>Use PayMatrix for illegal transactions, money laundering, fraud, or harassment.</li>
          <li>Spam unsolicited friend requests or group invitations.</li>
          <li>Attempt to reverse-engineer, exploit, or disrupt the API or cloud infrastructure.</li>
          <li>
            Upload abusive, defamatory, or malicious content in expense titles, notes, or group
            names.
          </li>
        </ul>
      </Section>

      <Section title="7. Data Rights, Export & Account Deletion">
        <p>
          In accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and
          applicable global privacy laws, you retain the right to export your financial ledger data
          and delete your account at any time via the{' '}
          <Link to="/delete-account" className="text-primary underline">
            Account Deletion page
          </Link>
          .
        </p>
        <p>
          Upon deletion, your personal identity is permanently and irreversibly anonymized to
          &quot;Deleted user&quot;, protecting your privacy while preserving mathematical balance
          integrity for your remaining group members.
        </p>
      </Section>

      <Section title="8. Disclaimer of Warranties & Limitation of Liability">
        <p>
          PayMatrix is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without
          warranties of any kind. We do not guarantee uninterrupted, bug-free, or 100% accurate
          operation.
        </p>
        <p>
          To the maximum extent permitted by law, PayMatrix and its operators shall not be liable
          for any indirect, incidental, consequential, or punitive damages arising from disputes
          between group members, incorrect expense entries, payment failures in external banking
          apps, or loss of data.
        </p>
      </Section>

      <Section title="9. Contact & Support">
        <p>
          If you have questions regarding these Terms or need assistance, you can reach out via our{' '}
          <a
            className="text-primary underline"
            href="https://github.com/Marshmellow31/PayMatrix/issues"
            target="_blank"
            rel="noreferrer"
          >
            Support Issue Tracker
          </a>
          .
        </p>
      </Section>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <Link
          to="/privacy"
          className="rounded-xl bg-white/5 hover:bg-white/10 px-4 py-3 text-sm font-bold text-white/70 transition-all"
        >
          View Privacy Policy
        </Link>
        <Link
          to="/"
          className="rounded-xl bg-white text-black hover:bg-white/90 px-4 py-3 text-sm font-bold transition-all"
        >
          Return to PayMatrix
        </Link>
      </div>
    </article>
  </main>
);

export default Terms;
