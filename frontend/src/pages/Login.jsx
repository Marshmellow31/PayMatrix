import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Globe } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';

const Login = () => {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.meta?.requestStatus === 'rejected') {
      toast.error(result.payload || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Hemisphere - Branding */}
      <div className="hidden md:flex flex-1 bg-surface-container-lowest p-12 lg:p-24 flex-col justify-between relative overflow-hidden noise">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold font-manrope text-primary tracking-tight">
            PayMatrix
          </h1>
        </div>
        
        <div className="z-10 mt-auto max-w-xl">
          <h2 className="text-5xl lg:text-7xl font-bold font-manrope text-primary leading-[1.1] tracking-[-0.02em] mb-6">
            The Obsidian<br />Standard in Fintech
          </h2>
          <p className="text-on-surface-variant text-lg max-w-md font-inter leading-relaxed">
            Enter your credentials to access your secure digital vault and manage shared expenses with absolute clarity.
          </p>
        </div>
      </div>

      {/* Right Hemisphere - Auth Form */}
      <div className="flex-1 flex justify-center items-center p-6 sm:p-12 relative bg-background">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          {/* Mobile visible logo */}
          <div className="md:hidden mb-12">
            <h1 className="text-3xl font-bold font-manrope text-primary tracking-tight">
              PayMatrix
            </h1>
          </div>

          <div className="mb-12">
             <h2 className="text-4xl font-bold font-manrope text-primary mb-3 tracking-[-0.01em]">
              Welcome back
             </h2>
             <p className="text-on-surface-variant font-inter">
               Sign in to your account to continue
             </p>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <Button variant="outline" className="w-full h-14 flex items-center justify-center gap-3 text-base">
              <Globe size={20} />
              Continue with Google
            </Button>
            <div className="flex items-center gap-4 my-2">
              <div className="h-[1px] flex-1 bg-outline-variant/20" />
              <span className="text-xs text-outline font-medium uppercase tracking-widest">or email</span>
              <div className="h-[1px] flex-1 bg-outline-variant/20" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              icon={Mail}
              required
              id="login-email"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              required
              id="login-password"
            />

            <div className="flex items-center justify-between mt-2 mb-4">
               <div className="flex items-center gap-2">
                 <input type="checkbox" id="remember" className="rounded-sm bg-surface-container-highest border-outline text-primary w-4 h-4 cursor-pointer focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background appearance-none checked:bg-primary checked:before:content-['✓'] checked:before:text-on-primary checked:before:text-xs text-center leading-4" />
                 <label htmlFor="remember" className="text-sm text-on-surface-variant font-inter cursor-pointer">Remember me</label>
               </div>
               <Link 
                 to="/forgot-password" 
                 className="text-sm font-medium text-primary hover:text-secondary focus:outline-none transition-colors"
               >
                 Forgot?
               </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full h-14 text-base">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-10 font-inter">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline transition-colors ml-1"
            >
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
