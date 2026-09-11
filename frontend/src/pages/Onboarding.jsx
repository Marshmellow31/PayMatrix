import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ScanLine, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingShell from '../components/onboarding/OnboardingShell.jsx';
import TrialWorkspace from '../components/onboarding/TrialWorkspace.jsx';
import FeatureShowcase from '../components/onboarding/FeatureShowcase.jsx';
import WelcomeSheet from '../components/onboarding/WelcomeSheet.jsx';
import { markOnboardingSeen } from '../hooks/useOnboardingState.js';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [expenseAdded, setExpenseAdded] = useState(false);
  const finish = (path = '/login') => {
    markOnboardingSeen();
    navigate(path);
  };
  const next = () => setStep((current) => Math.min(current + 1, 3));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  return (
    <OnboardingShell step={step} totalSteps={4} onBack={back} onSkip={() => finish()}>
      <AnimatePresence mode="wait">
        {step === 0 && <WelcomeSheet onContinue={() => finish('/login')} onExploreDemo={next} />}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full flex justify-center"
          >
            <TrialWorkspace
              expenseAdded={expenseAdded}
              onAddExpense={() => setExpenseAdded(true)}
              onContinue={next}
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full flex justify-center"
          >
            <FeatureShowcase index={featureIndex} onChange={setFeatureIndex} onContinue={next} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-4xl my-auto"
          >
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] sm:mb-5 sm:h-14 sm:w-14 sm:rounded-2xl">
                <ShieldCheck size={21} />
              </div>
              <h1 className="font-manrope text-3xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">
                Your next group
                <br />
                <span className="text-white/35">starts here.</span>
              </h1>
              <p className="mt-3.5 text-xs leading-5 text-white/50 sm:mt-5 sm:text-sm sm:leading-7">
                No long setup. Choose how you want to begin and we’ll take you straight to the
                useful part.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
              <button
                onClick={() => finish('/login?intent=create-group')}
                className="group rounded-[1.25rem] border border-white/15 bg-white p-5 text-left text-black transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(255,255,255,0.12)] sm:rounded-[1.5rem] sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white sm:h-10 sm:w-10 sm:rounded-xl">
                    <Users size={16} />
                  </span>
                  <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </div>
                <p className="mt-5 text-base font-black sm:mt-8 sm:text-lg">Create a new group</p>
                <p className="mt-1.5 text-[11px] leading-4 text-black/55 sm:mt-2 sm:text-xs sm:leading-5">
                  Start a trip, event, household, or anything you share.
                </p>
              </button>
              <button
                onClick={() => finish('/login?intent=join-group')}
                className="group rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08] sm:rounded-[1.5rem] sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.1] text-white sm:h-10 sm:w-10 sm:rounded-xl">
                    <ScanLine size={16} />
                  </span>
                  <ArrowRight
                    size={17}
                    className="text-white/50 transition group-hover:translate-x-1 group-hover:text-white"
                  />
                </div>
                <p className="mt-5 text-base font-black sm:mt-8 sm:text-lg">
                  Join an existing group
                </p>
                <p className="mt-1.5 text-[11px] leading-4 text-white/40 sm:mt-2 sm:text-xs sm:leading-5">
                  Have an invite? We’ll get you into the right ledger.
                </p>
              </button>
            </div>
            <div className="mt-6 text-center sm:mt-8">
              <button
                onClick={() => finish()}
                className="text-[11px] font-bold text-white/40 underline decoration-white/20 underline-offset-4 transition hover:text-white sm:text-xs"
              >
                I’ll sign in and explore first
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OnboardingShell>
  );
};

export default Onboarding;
