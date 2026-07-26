import { motion } from 'framer-motion';
import { ArrowRight, Check, ReceiptText, Sparkles, Users } from 'lucide-react';
import { TRIAL_GROUP, TRIAL_MEMBERS } from '../../utils/onboardingTrialData.js';

const currency = (value) => `${value < 0 ? '−' : '+'}₹${Math.abs(value)}`;

const TrialWorkspace = ({ expenseAdded, onAddExpense, onContinue }) => {
  const balances = expenseAdded ? TRIAL_GROUP.settledBalances : TRIAL_GROUP.originalBalances;
  return (
    <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-7">
      <div className="max-w-md">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200"><Sparkles size={13} /> Try it with sample data</div>
        <h1 className="font-manrope text-3xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">Add one expense.<br /><span className="text-white/35">Watch the split.</span></h1>
        <p className="mt-3 max-w-sm text-xs leading-5 text-white/50 sm:mt-5 sm:text-sm sm:leading-7">Tap the dinner below. You’ll see the exact moment PayMatrix turns a bill into a clear balance.</p>
        <button onClick={onContinue} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/70 transition hover:border-white/25 hover:text-white sm:mt-7 sm:py-3 sm:text-xs">Next: see what’s included <ArrowRight size={15} /></button>
      </div>

      <motion.div layout className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#171717]/90 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="absolute right-[-15%] top-[-25%] h-56 w-56 rounded-full bg-white/[0.05] blur-3xl" />
        <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-3 sm:pb-5"><div><p className="text-base font-black tracking-tight sm:text-lg">{TRIAL_GROUP.name}</p><p className="mt-1 text-[10px] text-white/35 sm:text-xs">{TRIAL_GROUP.subtitle}</p></div><div className="flex -space-x-2">{TRIAL_MEMBERS.map((member) => <div key={member.id} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171717] text-[8px] font-black sm:h-8 sm:w-8 sm:text-[9px] ${member.color}`}>{member.initials}</div>)}</div></div>
        <div className="relative mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 sm:mt-5 sm:p-4"><div className="flex items-start justify-between"><div className="flex items-center gap-2 sm:gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200 sm:h-10 sm:w-10"><ReceiptText size={16} /></div><div><p className="text-xs font-bold sm:text-sm">Beach shack dinner</p><p className="mt-1 text-[10px] text-white/35 sm:text-[11px]">Paid by Maya · split equally</p></div></div><span className="text-xs font-black sm:text-sm">₹2,460</span></div><button onClick={onAddExpense} disabled={expenseAdded} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.12] disabled:cursor-default disabled:text-emerald-200 sm:mt-4 sm:py-3 sm:text-xs">{expenseAdded ? <><Check size={15} /> Balances updated</> : <>Add this sample expense <ArrowRight size={14} /></>}</button></div>
        <div className="relative mt-3 sm:mt-5"><div className="mb-2 flex items-center justify-between sm:mb-3"><p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/35 sm:text-[10px]">Live balances</p><span className="text-[9px] font-bold text-white/25 sm:text-[10px]">Total ₹{TRIAL_GROUP.total.toLocaleString('en-IN')}</span></div><div className="grid grid-cols-3 gap-1.5 sm:gap-2">{TRIAL_MEMBERS.map((member) => <motion.div layout key={member.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2 sm:p-3"><div className="mb-2 flex items-center gap-1.5 sm:mb-3 sm:gap-2"><div className={`flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-black sm:h-6 sm:w-6 sm:text-[8px] ${member.color}`}>{member.initials}</div><span className="truncate text-[9px] font-bold text-white/65 sm:text-[11px]">{member.name}</span></div><motion.p key={balances[member.id]} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-xs font-black sm:text-sm ${balances[member.id] === 0 ? 'text-white/25' : balances[member.id] > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{balances[member.id] === 0 ? 'Settled' : currency(balances[member.id])}</motion.p></motion.div>)}</div></div>
        <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-emerald-300/[0.06] px-3 py-2 text-[10px] text-emerald-100/70 sm:mt-5 sm:py-2.5 sm:text-[11px]"><Users size={13} className="shrink-0 text-emerald-300" /> {expenseAdded ? 'The simplest settlement plan is ready.' : 'Everyone stays in sync as expenses change.'}</div>
      </motion.div>
    </div>
  );
};

export default TrialWorkspace;
