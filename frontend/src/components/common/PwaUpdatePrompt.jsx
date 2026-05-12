import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const PwaUpdatePrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates periodically (every hour)
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline', {
        icon: '📱',
        style: { background: '#1c1c1e', color: '#fff' }
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <RefreshCw size={16} className="text-emerald-400 animate-[spin_3s_linear_infinite]" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Update Available</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">New Version</span>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed font-inter">
              A new version of PayMatrix is ready. Update now to get the latest improvements and bug fixes.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setNeedRefresh(false);
                }}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
              >
                Later
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Passing true to updateServiceWorker sends SKIP_WAITING to sw.js and reloads the page
                  updateServiceWorker(true);
                }}
                className="flex-[2] py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-black hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Update Now
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity, // Keep the toast open until user interacts
          position: 'bottom-center',
          style: {
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
            minWidth: '320px',
            padding: '20px',
            borderRadius: '24px'
          }
        }
      );
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};

export default PwaUpdatePrompt;
