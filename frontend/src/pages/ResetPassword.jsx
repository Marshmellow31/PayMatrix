import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiLockClosed, HiShieldCheck } from 'react-icons/hi';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';
import { auth } from '../config/firebase.js';
import { confirmPasswordReset } from 'firebase/auth';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      // Firebase standard reset uses 'oobCode' which we map from token param
      await confirmPasswordReset(auth, token, password);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
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
            Secure Your<br />Identity
          </h2>
          <p className="text-on-surface-variant text-lg max-w-md font-inter leading-relaxed">
            Create a new, strong password to regain access to your vault and ensure your financial clearity remains protected.
          </p>
        </div>
      </div>

      {/* Right Hemisphere - Form */}
      <div className="flex-1 flex justify-center items-center p-6 sm:p-12 relative bg-background">
        <motion.div
           className="w-full max-w-md"
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          <div className="mb-12">
             <h2 className="text-4xl font-bold font-manrope text-primary mb-3 tracking-[-0.01em]">
               Reset password
             </h2>
             <p className="text-on-surface-variant font-inter">
               Please enter your new password below
             </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={HiLockClosed}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={HiShieldCheck}
              required
            />
            <Button type="submit" loading={loading} className="w-full h-14">
              Reset Password
            </Button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-10 font-inter">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline transition-colors ml-1">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
