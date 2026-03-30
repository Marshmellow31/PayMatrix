import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiMail, HiArrowLeft } from 'react-icons/hi';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../utils/constants';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Hemisphere - Branding */}
      <div className="hidden md:flex flex-1 bg-surface-container-lowest p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors font-medium">
            <HiArrowLeft />
            Back to login
          </Link>
        </div>
        
        <div className="z-10 mt-auto max-w-xl">
          <h2 className="text-5xl lg:text-7xl font-bold font-manrope text-primary leading-[1.1] tracking-[-0.02em] mb-6">
            Recover Your<br />Digital Identity
          </h2>
          <p className="text-on-surface-variant text-lg max-w-md font-inter leading-relaxed">
            We'll send a secure restoration link to your registered email address to help you regain access to your vault.
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
          {/* Mobile visible back link */}
          <div className="md:hidden mb-12">
             <Link to="/login" className="inline-flex items-center gap-2 text-primary font-medium">
               <HiArrowLeft />
               Back to login
             </Link>
          </div>

          {!submitted ? (
            <>
              <div className="mb-12">
                 <h2 className="text-4xl font-bold font-manrope text-primary mb-3 tracking-[-0.01em]">
                   Forgot password?
                 </h2>
                 <p className="text-on-surface-variant font-inter">
                   Enter email to receive reset instructions
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={HiMail}
                  required
                />
                <Button type="submit" loading={loading} className="w-full h-14">
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-8">
                <HiMail className="text-primary text-3xl" />
              </div>
              <h2 className="text-3xl font-bold font-manrope text-primary mb-4">Check your email</h2>
              <p className="text-on-surface-variant font-inter mb-10 leading-relaxed">
                We've sent a password reset link to <span className="text-primary font-medium">{email}</span>.
              </p>
              <Button variant="secondary" onClick={() => setSubmitted(false)} className="w-full h-14">
                Didn't receive it? Try again
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
