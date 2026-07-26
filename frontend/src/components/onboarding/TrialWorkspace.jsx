import { motion } from 'framer-motion';
import { ArrowRight, Check, ReceiptText, Sparkles, Users } from 'lucide-react';
import { TRIAL_GROUP, TRIAL_MEMBERS } from '../../utils/onboardingTrialData.js';

const currency = (value) => `${value < 0 ? '−' : '+'}₹${Math.abs(value)}`;

const TrialWorkspace = ({ expenseAdded, onAddExpense, onContinue }) => {
  const balances = expenseAdded ? TRIAL_GROUP.settledBalances : TRIAL_GROUP.originalBalances;
  return (
    <div className="grid w-full max-w-6xl gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div className="max-w-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200"><Sparkles size={13} /> Try it with sample data</div>
        <h1 className="font-manrope text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">Add one expense.<br /><span className="text-white/35">Watch the split.</span></h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-white/50">Tap the dinner below. You’ll see the exact moment PayMatrix turns a bill into a clear balance.</p>
        <button onClick={onContinue} className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white/70 transition hover:border-white/25 hover:text-white">Next: see what’s included <ArrowRight size={15} /></button>
      </div>

      <motion.div layout className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#171717]/90 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="absolute right-[-15%] top-[-25%] h-56 w-56 rounded-full bg-white/[0.05] blur-3xl" />
        <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-5"><div><p className="text-lg font-black tracking-tight">{TRIAL_GROUP.name}</p><p className="mt-1 text-xs text-white/35">{TRIAL_GROUP.subtitle}</p></div><div className="flex -space-x-2">{TRIAL_MEMBERS.map((member) => <div key={member.id} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171717] text-[9px] font-black ${member.color}`}>{member.initials}</div>)}</div></div>
        <div className="relative mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><ReceiptText size={18} /></div><div><p className="text-sm font-bold">Beach shack dinner</p><p className="mt-1 text-[11px] text-white/35">Paid by Maya · split equally</p></div></div><span className="text-sm font-black">₹2,460</span></div><button onClick={onAddExpense} disabled={expenseAdded} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.12] disabled:cursor-default disabled:text-emerald-200">{expenseAdded ? <><Check size={15} /> Balances updated</> : <>Add this sample expense <ArrowRight size={14} /></>}</button></div>
        <div className="relative mt-5"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.17em] text-white/35">Live balances</p><span className="text-[10px] font-bold text-white/25">Total ₹{TRIAL_GROUP.total.toLocaleString('en-IN')}</span></div><div className="grid grid-cols-3 gap-2">{TRIAL_MEMBERS.map((member) => <motion.div layout key={member.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="mb-3 flex items-center gap-2"><div className={`flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-black ${member.color}`}>{member.initials}</div><span className="truncate text-[11px] font-bold text-white/65">{member.name}</span></div><motion.p key={balances[member.id]} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-sm font-black ${balances[member.id] === 0 ? 'text-white/25' : balances[member.id] > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{balances[member.id] === 0 ? 'Settled' : currency(balances[member.id])}</motion.p></motion.div>)}</div></div>
        <div className="relative mt-5 flex items-center gap-2 rounded-xl bg-emerald-300/[0.06] px-3 py-2.5 text-[11px] text-emerald-100/70"><Users size={14} className="shrink-0 text-emerald-300" /> {expenseAdded ? 'The simplest settlement plan is ready.' : 'Everyone stays in sync as expenses change.'}</div>
      </motion.div>
    </div>
  );
};

export default TrialWorkspace;
