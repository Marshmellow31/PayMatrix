import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import Loader from '../components/common/Loader.jsx';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { UserPlus, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button.jsx';

const JoinGroup = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState('');
  const [groupData, setGroupData] = useState(null);

  useEffect(() => {
    if (!token) {
      // Store the invite code to join after login
      localStorage.setItem('pendingInviteCode', code);
      navigate('/login');
      return;
    }

    const joinGroup = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await axios.post(`/api/v1/groups/join/${code}`, {}, config);
        setStatus('success');
        setGroupData(response.data.data);
        toast.success('Successfully joined the cohort!');
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to join group. The link might be invalid or expired.');
      }
    };

    joinGroup();
  }, [code, token, navigate]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <Loader size="lg" />
        <p className="mt-8 font-manrope font-bold text-on-surface-variant animate-pulse tracking-widest uppercase text-[10px]">
          Validating Invitation...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-sm w-full p-10 rounded-[3rem] border border-white/5 text-center relative z-10"
      >
        <div className="mb-8 flex justify-center">
          {status === 'success' ? (
            <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle size={48} />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle size={48} />
            </div>
          )}
        </div>

        <h1 className="font-manrope font-black text-3xl text-white mb-4 tracking-tighter leading-none">
          {status === 'success' ? 'Cohort Joined' : 'Access Denied'}
        </h1>
        
        <p className="font-inter text-on-surface-variant text-sm mb-10 leading-relaxed opacity-70">
          {status === 'success' 
            ? "You've been successfully integrated into the group ledger. You can now track shared expenses with this cohort."
            : error}
        </p>

        {status === 'success' ? (
          <Button 
            onClick={() => navigate(`/groups/${groupData.groupId}`)}
            className="w-full h-16 rounded-3xl font-manrope font-black text-lg bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 shadow-2xl"
          >
            Enter Workspace
            <ArrowRight size={20} />
          </Button>
        ) : (
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full h-16 rounded-3xl font-manrope font-black text-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            Return to Dashboard
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default JoinGroup;
