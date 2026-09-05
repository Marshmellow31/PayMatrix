import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { CheckCircle2 } from 'lucide-react';

const releases = [
  {
    version: '2.2.1',
    date: 'September 2026',
    tag: 'Latest Production Release',
    highlights: [
      'Multi-payer expense engine: divide paid amount equally or unequally (₹ Exact / % Percent) among multiple payers.',
      '3-step expense creation workflow with snug header and pinned action controls.',
      'Distinct colored category icons with centered titles and boxed amount display card.',
      'Horizontally swipeable 3-row avatar selection grids for both payers and split participants.',
      'Universal Google avatar propagation to users, publicProfiles, and friendCodes protecting custom uploads.',
      'Hardened GST Itemized calculation with safe numeric parsing preventing crash states.',
    ],
  },
  {
    version: '2.2.0',
    date: 'September 2026',
    tag: 'Production Release',
    highlights: [
      'Full synchronization between web and native Android 2.2.0 workflows.',
      'All 5 split modes (Equal, Percentage, Exact, Shares, GST Itemized) with remainder preservation.',
      'Collaborative editing enabled across all group expenses and shared spending logs.',
      'Optimistic version locking protecting against concurrent edit conflicts.',
      'Digital Asset Links integration for verified Android App Links domain verification.',
    ],
  },
  {
    version: '2.1.0',
    date: 'August 2026',
    tag: 'Production Release',
    highlights: [
      'Native Android Kotlin/Jetpack Compose architecture release.',
      'Google Play targetSdk 36 readiness and Modern AndroidX Credential Manager.',
      'Integer-paise mathematical precision engine across all split types.',
      'Deterministic debt simplification with proportional tax/discount distribution.',
      'Enhanced DPDP Act and GDPR compliance with instant account anonymization.',
    ],
  },
  {
    version: '2.0.0',
    date: 'July 2026',
    tag: 'Major Upgrade',
    highlights: [
      'Gemini AI multi-photo receipt scanning and itemization.',
      'NPCI-compliant UPI QR settle-up engine.',
      'FCM push notification triggers for expenses and settlements.',
      'Custom-claims administrative control center.',
    ],
  },
];

const ChangelogModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PayMatrix Changelog" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {releases.map((rel) => (
          <div
            key={rel.version}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-black font-manrope text-white">
                  Version {rel.version}
                </span>
                <span className="text-xs text-white/40 font-inter">({rel.date})</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {rel.tag}
              </span>
            </div>

            <ul className="space-y-2 pt-1">
              {rel.highlights.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-white/70 font-inter leading-relaxed"
                >
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <Button onClick={onClose} className="w-full text-xs font-bold uppercase tracking-widest">
          Close Release Notes
        </Button>
      </div>
    </Modal>
  );
};

export default ChangelogModal;
