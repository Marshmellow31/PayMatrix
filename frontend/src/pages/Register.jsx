import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiUser, HiMail, HiLockClosed } from 'react-icons/hi';
import useAuth from '../hooks/useAuth.js';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';

const Register = () => {
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(form);
    if (result.meta.requestStatus === 'rejected') {
      toast.error(result.payload || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Hemisphere - Branding */}
      <div className="hidden md:flex flex-1 bg-surface-container-lowest p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
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
            Create an account to access your secure digital vault and manage shared expenses with absolute clarity.
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
              Create account
             </h2>
             <p className="text-on-surface-variant font-inter">
               Enter your details to get started
             </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" icon={HiUser} required id="register-name" />
            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" icon={HiMail} required id="register-email" />
            <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" icon={HiLockClosed} required id="register-password" />

            <div className="mt-2 text-sm text-on-surface-variant font-inter">
              By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </div>

            <Button type="submit" loading={loading} className="w-full h-14 text-base">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-10 font-inter">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline transition-colors ml-1">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
