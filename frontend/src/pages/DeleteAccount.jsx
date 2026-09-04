import { useState } from 'react';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import accountService from '../services/accountService.js';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { auth } from '../config/firebase.js';

const DeleteAccount = () => {
  const [confirmation, setConfirmation] = useState('');
  const [working, setWorking] = useState(false);
  const [password, setPassword] = useState('');
  const user = useSelector((state) => state.auth.user);
  const usesPassword = auth.currentUser?.providerData?.some(
    (provider) => provider.providerId === 'password'
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 text-white">
        <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <h1 className="text-3xl font-black">Delete your PayMatrix account</h1>
          <p className="text-sm leading-6 text-white/50">
            Sign in with the Google account or verified email you use for paymatrix. You can then
            export your data and permanently delete the account after reauthentication.
          </p>
          <Link
            to="/login?returnTo=%2Fdelete-account"
            className="inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black text-black"
          >
            Sign in to continue
          </Link>
          <p>
            <Link to="/privacy" className="text-sm text-primary underline">
              Read the privacy policy
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const exportData = async () => {
    setWorking(true);
    try {
      await accountService.exportMyData();
      toast.success('Your data export is ready.');
    } catch (error) {
      toast.error(error.message || 'Export failed.');
    } finally {
      setWorking(false);
    }
  };

  const removeAccount = async () => {
    if (confirmation !== 'DELETE') return;
    setWorking(true);
    try {
      await accountService.deleteMyAccount(password);
      localStorage.clear();
      window.location.replace('/login?deleted=1');
    } catch (error) {
      toast.error(error.message || 'Account deletion could not be completed.');
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="glass-card space-y-8 border border-red-500/20 p-6 sm:p-10">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
            <AlertTriangle />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Delete your PayMatrix account</h1>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Your name, photo, contact details, UPI ID, friend links, and sign-in account are
              removed. Shared financial records remain under an anonymous “Deleted user” identity so
              group balances and audit history stay correct.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/55">
          A non-personal deletion receipt is retained for 30 days. Your real name is not retained
          after deletion.
        </div>

        <button
          onClick={exportData}
          disabled={working}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
        >
          <Download size={17} /> Export my data first
        </button>

        <div className="space-y-3">
          {usesPassword && (
            <>
              <label
                htmlFor="delete-password"
                className="text-xs font-bold uppercase tracking-widest text-white/50"
              >
                Current password
              </label>
              <input
                id="delete-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="h-14 w-full rounded-2xl border border-white/10 bg-black px-4 text-white outline-none focus:border-red-500/50"
              />
            </>
          )}
          <label
            htmlFor="delete-confirmation"
            className="text-xs font-bold uppercase tracking-widest text-white/50"
          >
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-white/10 bg-black px-4 text-white outline-none focus:border-red-500/50"
          />
          <button
            onClick={removeAccount}
            disabled={working || confirmation !== 'DELETE' || (usesPassword && !password)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 text-sm font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 size={17} /> {working ? 'Working…' : 'Permanently delete account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;
