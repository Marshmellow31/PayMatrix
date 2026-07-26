import { motion } from 'framer-motion';
import { BarChart3, Check, ChevronRight, Cloud, QrCode, ScanLine, ShieldCheck } from 'lucide-react';
import { TRIAL_FEATURES } from '../../utils/onboardingTrialData.js';

const icons = { scan: ScanLine, chart: BarChart3, qr: QrCode, sync: Cloud };

const FeatureShowcase = ({ index, onChange, onContinue }) => {
  const feature = TRIAL_FEATURES[index];
  const Icon = icons[feature.icon];
  return (
    <div className="w-full max-w-5xl">
      <div className="mb-10 max-w-xl"><div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35"><ShieldCheck size={14} className="text-emerald-300" /> Everything included, no upgrade wall</div><h1 className="font-manrope text-4xl font-black tracking-[-0.05em] sm:text-6xl">Premium clarity.<br /><span className="text-white/35">Free for your group.</span></h1><p className="mt-5 text-sm leading-7 text-white/50">The small details that make shared money feel effortless are already built in.</p></div>
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]"><motion.div key={feature.title} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="relative min-h-[240px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.025] p-7"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.07] blur-2xl" /><div className="relative flex h-full flex-col justify-between"><div><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-xl"><Icon size={22} /></div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{feature.eyebrow}</p><h2 className="mt-2 max-w-sm text-2xl font-black tracking-tight sm:text-3xl">{feature.title}</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/45">{feature.body}</p></div><div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-200"><Check size={15} /> Included in every group</div></div></motion.div><div className="grid grid-cols-2 gap-3">{TRIAL_FEATURES.map((item, itemIndex) => { const ItemIcon = icons[item.icon]; return <button key={item.title} onClick={() => onChange(itemIndex)} className={`rounded-2xl border p-4 text-left transition ${itemIndex === index ? 'border-white/30 bg-white/[0.10]' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.06]'}`}><ItemIcon size={17} className={itemIndex === index ? 'text-white' : 'text-white/35'} /><p className="mt-5 text-xs font-black leading-4">{item.title}</p><p className="mt-2 text-[10px] leading-4 text-white/30">{item.eyebrow}</p></button>; })}</div></div>
      <div className="mt-8 flex items-center justify-between"><button onClick={onContinue} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-white/85">Choose your path <ChevronRight size={15} /></button><div className="flex gap-1.5">{TRIAL_FEATURES.map((_, itemIndex) => <button key={itemIndex} onClick={() => onChange(itemIndex)} aria-label={`Show feature ${itemIndex + 1}`} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`} />)}</div></div>
    </div>
  );
};

export default FeatureShowcase;
