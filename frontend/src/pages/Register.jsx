import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const Register = () => {
  const { googleLogin, loading } = useAuth();

  const handleGoogleSignup = async () => {
    const result = await googleLogin();
    if (result.meta?.requestStatus === 'rejected') {
      toast.error(result.payload || 'Google registration failed');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", damping: 25, stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center p-4 relative overflow-hidden font-manrope selection:bg-white/10">
      {/* Background Decorative Elements - Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full noise opacity-10 pointer-events-none" />

      <motion.div 
        className="w-full max-w-[1000px] grid md:grid-cols-2 bg-[#1c1c1c]/90 backdrop-blur-3xl border border-white/5 rounded-[32px] md:rounded-[40px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] z-10"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Left Hemisphere - Authentication */}
        <div className="p-8 md:p-16 lg:p-20 flex flex-col justify-center items-center relative overflow-hidden bg-[#131313] order-2 md:order-1">
          <motion.div
            className="w-full max-w-[340px] md:max-w-sm mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Branding for mobile - Visible only on Mobile */}
            <motion.div className="md:hidden mb-12 flex items-center gap-4 justify-center" variants={itemVariants}>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <div className="w-5 h-5 bg-[#131313] rounded-[4px]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white uppercase">PayMatrix</span>
            </motion.div>

            <motion.div className="mb-10 text-center md:text-left" variants={itemVariants}>
               <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Create Account
               </h2>
               <p className="text-white/40 font-inter text-sm leading-relaxed max-w-[280px] mx-auto md:mx-0">
                 Join the secure financial orchestration network with Google.
               </p>
            </motion.div>

            <motion.div className="space-y-8" variants={itemVariants}>
              <button 
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full py-4 md:py-5 bg-white hover:bg-[#F8F8F8] active:scale-[0.98] transition-all rounded-[18px] md:rounded-[20px] flex items-center justify-center gap-4 group relative shadow-xl"
              >
                <div className="shrink-0">
                  <GoogleIcon />
                </div>
                <span className="text-[#131313] font-bold tracking-tight text-base md:text-lg">
                  {loading ? 'Processing...' : 'Continue with Google'}
                </span>
              </button>
              
              <div className="pt-4 md:pt-6 space-y-5">
                 <p className="text-[11px] md:text-[12px] text-center text-white/20 font-inter leading-relaxed max-w-[300px] mx-auto px-4">
                    By starting, you agree to our <a href="#" className="underline underline-offset-4 text-white/40 hover:text-white transition-colors">Terms</a> and <a href="#" className="underline underline-offset-4 text-white/40 hover:text-white transition-colors">Policies</a>.
                 </p>
              </div>
            </motion.div>

            <motion.p className="text-center text-sm text-white/30 mt-12 md:mt-16 font-inter" variants={itemVariants}>
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:underline transition-all tracking-wide decoration-white decoration-2 underline-offset-8">
                Sign In
              </Link>
            </motion.p>
          </motion.div>
        </div>

        {/* Right Hemisphere - Branding & Experience (Hidden on Mobile) */}
        <div className="hidden md:flex p-16 lg:p-20 flex-col justify-end items-end relative bg-gradient-to-tl from-[#242424] to-transparent text-right order-1 md:order-2">
          <div className="relative z-10 w-full mb-auto pb-20">
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 justify-end"
            >
              <span className="text-2xl font-bold tracking-tight text-white uppercase letter-spacing-[0.05em]">PayMatrix</span>
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <div className="w-5 h-5 bg-[#131313] rounded-[4px]" />
              </div>
            </motion.div>
          </div>
          
          <div className="z-10 w-full">
            <motion.div
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.7 }}
            >
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 mb-8 inline-block">
                Secure Onboarding
              </span>
              <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight mb-8">
                Step into the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-white via-white/80 to-white/40">
                  Obsidian Layer
                </span>
              </h1>
              <p className="text-white/30 text-lg font-inter leading-relaxed max-w-sm ml-auto">
                Step into a unified ecosystem built for transparency and precision.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
