import { ArrowLeft, SkipForward } from 'lucide-react';

const OnboardingShell = ({ children, step, onBack, onSkip }) => (
  <main className="relative h-[100dvh] min-h-0 overflow-hidden bg-[#0e0e0e] text-white sm:min-h-screen sm:overflow-x-hidden">
    <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/[0.06] blur-[110px]" />
    <div className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-sky-400/[0.06] blur-[130px]" />
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4 py-3 sm:min-h-screen sm:px-8 sm:py-5 lg:px-12">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button
          onClick={onBack}
          disabled={step === 0}
          className="flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-0"
          aria-label="Go back"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-center">
          <span className="text-sm font-black uppercase tracking-[0.16em]">PayMatrix</span>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-2 text-[11px] font-bold text-white/50 transition hover:bg-white/[0.06] hover:text-white sm:px-3 sm:text-xs"
          >
            <SkipForward size={14} /> <span>Skip</span>
          </button>
        </div>
      </header>
      <section className="min-h-0 flex-1 flex flex-col justify-center overflow-y-auto py-6 sm:items-center sm:overflow-visible sm:py-14">
        {children}
      </section>
      <p className="hidden pb-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/20 sm:block sm:pb-2 sm:text-[10px] sm:tracking-[0.2em]">
        Private by default · ready when your group is
      </p>
    </div>
  </main>
);

export default OnboardingShell;
