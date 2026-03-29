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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-manrope text-primary mb-2">
            💸 PayMatrix
          </h1>
          <p className="text-on-surface-variant text-sm">
            Create your free account
          </p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold font-manrope text-on-surface mb-6">
            Get started
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" icon={HiUser} required id="register-name" />
            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" icon={HiMail} required id="register-email" />
            <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" icon={HiLockClosed} required id="register-password" />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
