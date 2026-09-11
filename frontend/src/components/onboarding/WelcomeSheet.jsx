import { motion } from 'framer-motion';
import { Coins, Users, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import AppLogo from '../common/AppLogo.jsx';

const FEATURES = [
  {
    icon: Coins,
    accent: 'emerald',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    title: 'Paise-Level Precision',
    description:
      'Deterministic arithmetic down to exact integer paise. Every rupee is conserved with zero rounding drift.',
  },
  {
    icon: Users,
    accent: 'amber',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    title: 'Smart Multi-Payer Ledgers',
    description:
      'Support for multiple payers and uneven splits. Balances are simplified into the fewest direct transfers.',
  },
  {
    icon: Zap,
    accent: 'sky',
    iconBg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    title: 'Instant UPI Settlements',
    description:
      'One-tap deep linking to GPay, PhonePe, and Paytm with QR fallback and unconfirmed payment isolation.',
  },
];

const WelcomeSheet = ({ onContinue, onExploreDemo }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative mx-auto flex w-full max-w-lg flex-col justify-between rounded-3xl sm:rounded-[2rem] border border-white/10 bg-[#121212]/95 p-6 sm:p-8 md:p-9 shadow-[0_30px_100px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
    >
      {/* Top Header */}
      <div>
        <div className="mb-5 flex items-center gap-2.5">
          <AppLogo size="xs" decorative />
          <span className="text-xs font-black tracking-[0.2em] text-white/50 lowercase">
            paymatrix
          </span>
        </div>

        <h1 className="font-manrope text-3xl font-black tracking-tight text-white sm:text-4xl sm:leading-[1.1]">
          Welcome to <span className="text-white">paymatrix</span>
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-white/55 sm:text-sm">
          Effortless shared expenses, real-time debt simplification, and direct UPI settlement
          tracking.
        </p>
      </div>

      {/* Feature Showcase Rows */}
      <div className="my-7 flex flex-col gap-5 sm:my-8 sm:gap-6">
        {FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div key={feat.title} className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${feat.iconBg} shadow-inner`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-sm font-bold text-white sm:text-base">{feat.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{feat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Privacy Badge */}
      <div className="border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/40">
          <ShieldCheck size={15} className="shrink-0 text-white/50" />
          <p className="leading-tight">
            Encrypted ledgers. Your financial data is private and never sold or shared.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_10px_35px_rgba(255,255,255,0.15)] transition hover:bg-neutral-200 active:scale-[0.99] sm:py-4"
          >
            Continue <ArrowRight size={16} />
          </button>

          {onExploreDemo && (
            <button
              onClick={onExploreDemo}
              className="w-full py-2.5 text-center text-xs font-bold text-white/45 transition hover:text-white"
            >
              Explore interactive sandbox
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeSheet;
