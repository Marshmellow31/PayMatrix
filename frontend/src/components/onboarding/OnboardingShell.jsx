import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, SkipForward } from 'lucide-react';

const OnboardingShell = ({ children, step, totalSteps, onBack, onSkip, onSignIn }) => (
  <main className="relative min-h-screen overflow-hidden bg-[#0e0e0e] text-white">
    <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/[0.06] blur-[110px]" />
    <div className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-sky-400/[0.06] blur-[130px]" />
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between">
        <button onClick={onBack} disabled={step === 0} className="flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-0" aria-label="Go back">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white shadow-[0_0_30px_rgba(255,255,255,0.12)]"><div className="h-4 w-4 rounded-[4px] bg-[#0e0e0e]" /></div>
          <span className="text-sm font-black uppercase tracking-[0.16em]">PayMatrix</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSignIn} className="hidden rounded-full px-3 py-2 text-xs font-bold text-white/50 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex sm:items-center sm:gap-2"><LogIn size={14} /> Sign in</button>
          <button onClick={onSkip} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-white/50 transition hover:bg-white/[0.06] hover:text-white"><SkipForward size={14} /> Skip</button>
        </div>
      </header>
      <div className="mt-7 flex items-center gap-2" aria-label={`Step ${step + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, index) => <motion.div key={index} className="h-1 rounded-full bg-white" animate={{ width: index === step ? 40 : 16, opacity: index <= step ? 1 : 0.15 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} />)}
        <span className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">{step + 1} / {totalSteps}</span>
      </div>
      <section className="flex flex-1 items-center justify-center py-10 sm:py-14">{children}</section>
      <p className="pb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Private by default · ready when your group is</p>
    </div>
  </main>
);

export default OnboardingShell;
