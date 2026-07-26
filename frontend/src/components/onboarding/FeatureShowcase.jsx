import { motion } from 'framer-motion';
import {
  BarChart3,
  Check,
  ChevronRight,
  Cloud,
  QrCode,
  ScanLine,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { TRIAL_FEATURES } from '../../utils/onboardingTrialData.js';

const icons = { scan: ScanLine, chart: BarChart3, qr: QrCode, sync: Cloud };

const FeatureMockup = ({ type }) => {
  if (type === 'scan')
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black">Add expense</span>
          <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] text-white/40">
            Goa Weekend
          </span>
        </div>
        <div className="rounded-xl border border-dashed border-emerald-300/30 bg-emerald-300/[0.05] p-5 text-center">
          <ScanLine className="mx-auto text-emerald-200" size={25} />
          <p className="mt-3 text-xs font-bold">Scan a receipt</p>
          <p className="mt-1 text-[10px] text-white/35">AI fills in the details for you</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3">
          <span className="text-[11px] text-white/50">Dinner · 3 people</span>
          <span className="text-xs font-black">₹2,460</span>
        </div>
      </div>
    );
  if (type === 'chart')
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black">Balances</span>
          <span className="text-[10px] text-emerald-300">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['You', '+₹420', 'text-emerald-300'],
            ['Maya', '−₹180', 'text-rose-300'],
            ['Leo', '−₹240', 'text-rose-300'],
          ].map(([name, amount, color]) => (
            <div key={name} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/45">{name}</p>
              <p className={`mt-3 text-xs font-black ${color}`}>{amount}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-300/[0.06] p-3 text-[10px] text-emerald-100/70">
          <BarChart3 size={14} className="text-emerald-300" /> One clear settlement plan
        </div>
      </div>
    );
  if (type === 'qr')
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black">Settle up</span>
          <span className="text-[10px] text-white/35">Maya → You</span>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-black">
            <QrCode size={46} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/35">Amount due</p>
            <p className="mt-1 text-2xl font-black">₹180</p>
            <p className="mt-1 text-[10px] text-white/35">UPI QR ready to scan</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.06] py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/65">
          Mark as settled
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black">Recent activity</span>
        <span className="text-[10px] text-emerald-300">Synced</span>
      </div>
      {['Maya added Beach shack dinner', 'Leo joined Goa Weekend', 'You opened the group'].map(
        (item, index) => (
          <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-white/50">
              <Users size={13} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/70">{item}</p>
              <p className="mt-1 text-[9px] text-white/30">
                {index + 1} min ago · everyone can see it
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

const FeatureShowcase = ({ index, onChange, onContinue }) => {
  const feature = TRIAL_FEATURES[index];
  const Icon = icons[feature.icon];
  const isLast = index === TRIAL_FEATURES.length - 1;
  return (
    <div className="flex flex-col gap-8 sm:gap-10 w-full max-w-5xl pb-24 sm:pb-0 my-auto">
      <div className="max-w-xl sm:mb-2">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:mb-4 sm:text-[10px] sm:tracking-[0.18em]">
          <ShieldCheck size={13} className="text-emerald-300" /> Everything included, no upgrade
          wall
        </div>
        <h1 className="font-manrope text-3xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">
          Premium clarity.
          <br />
          <span className="text-white/35">Free for your group.</span>
        </h1>
        <p className="mt-2 text-xs leading-5 text-white/50 sm:mt-4 sm:text-sm sm:leading-7">
          A quick look at the real tools waiting inside your group.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-8">
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-white/[0.11] to-white/[0.025] p-4 sm:rounded-[2rem] sm:p-7"
        >
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-xl sm:mb-6 sm:h-11 sm:w-11 sm:rounded-2xl">
                <Icon size={18} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">
                {feature.eyebrow}
              </p>
              <h2 className="mt-1 max-w-sm text-xl font-black leading-tight tracking-tight sm:mt-2 sm:text-3xl">
                {feature.title}
              </h2>
              <p className="mt-2 max-w-sm text-xs leading-5 text-white/45 sm:mt-3 sm:text-sm sm:leading-6">
                {feature.body}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-200 sm:mt-8 sm:text-xs">
              <Check size={14} /> Included in every group
            </div>
          </div>
        </motion.div>
        <motion.div
          key={`${feature.title}-mockup`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.25rem] border border-white/10 bg-[#171717]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.3)] sm:rounded-[2rem] sm:p-7"
        >
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-3 sm:mb-5 sm:pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30 sm:text-[10px] sm:tracking-[0.18em]">
                Goa Weekend
              </p>
              <p className="mt-1 text-[10px] text-white/35 sm:text-[11px]">
                This is what it looks like inside
              </p>
            </div>
            <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-200 sm:text-[9px]">
              Sample
            </span>
          </div>
          <FeatureMockup type={feature.icon} />
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-white/[0.08] bg-[#0e0e0e]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <button
          onClick={isLast ? onContinue : () => onChange(index + 1)}
          className="order-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-white/85 sm:order-none sm:w-auto"
        >
          {isLast ? 'Choose how to start' : 'Next feature'} <ChevronRight size={15} />
        </button>
        <div className="order-2 flex items-center justify-center gap-2 sm:order-none sm:ml-auto">
          {TRIAL_FEATURES.map((item, itemIndex) => (
            <button
              key={item.title}
              onClick={() => onChange(itemIndex)}
              aria-label={`Show feature ${itemIndex + 1}`}
              className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-7 bg-white' : 'w-1.5 bg-white/20'}`}
            />
          ))}
          <span className="ml-1 text-[10px] font-black text-white/30">
            {index + 1} / {TRIAL_FEATURES.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FeatureShowcase;
