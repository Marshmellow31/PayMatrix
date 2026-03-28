import { useDispatch, useSelector } from "react-redux";
import { logout, reset } from "../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "../components/layout/Layout";
import { Card, Button, Input } from "../components/common";
import { 
  User, 
  Settings, 
  Fingerprint, 
  LogOut, 
  Mail, 
  ShieldCheck,
} from "lucide-react";

export const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate("/auth");
  };

  return (
    <Layout>
      <div className="space-y-12">
        {/* Profile Header (Asymmetric) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 pt-12">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-surface-container-high relative rounded-3xl overflow-hidden group">
                <div className="w-full h-full bg-primary/5 p-4 rounded-3xl group-hover:bg-primary transition-all duration-500 flex items-center justify-center text-primary group-hover:text-background">
                    <User size={48} strokeWidth={1} />
                </div>
            </div>
            <div className="space-y-2">
                <h1 className="text-5xl font-manrope font-extrabold text-primary tracking-tighter">
                    {user?.name || "Member Profile"}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-on-surface-variant opacity-60 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Mail size={14} className="opacity-40" /> {user?.email || "No Email Linked"}
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="opacity-40" /> Verified Member
                    </div>
                </div>
            </div>
          </div>
          
          <Button variant="secondary" className="px-6 py-2 text-[10px] uppercase tracking-widest leading-none">
            Edit Information
          </Button>
        </header>

        {/* Settings Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h3 className="text-sm tracking-[0.2em] font-medium uppercase text-on-surface-variant flex items-center gap-2">
                    <Settings size={16} /> Device Preferences
                </h3>
                
                <Card className="glass-panel space-y-6">
                    <div className="flex justify-between items-center group">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Biometric Auth</h4>
                            <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest">Enhanced Security</p>
                        </div>
                        <div className="w-10 h-6 bg-surface-container-highest rounded-full relative p-1 shadow-inner group-hover:bg-primary/20 transition-all">
                            <div className="w-4 h-4 bg-primary rounded-full float-right" />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center group">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Push Notifications</h4>
                            <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest">Real-time alerts</p>
                        </div>
                        <div className="w-10 h-6 bg-surface-container-highest rounded-full relative p-1 shadow-inner group-hover:bg-primary/20 transition-all">
                            <div className="w-4 h-4 bg-on-surface-variant/20 rounded-full" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-6">
                <h3 className="text-sm tracking-[0.2em] font-medium uppercase text-on-surface-variant flex items-center gap-2">
                    <Fingerprint size={16} /> Data & Sync
                </h3>
                
                <Card className="glass-panel space-y-6">
                    <div className="flex justify-between items-center group">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Cloudinary Storage</h4>
                            <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest">Asset Management Active</p>
                        </div>
                        <span className="text-[10px] border border-on-surface-variant/20 px-2 py-1 rounded text-primary opacity-60">
                            Synced
                        </span>
                    </div>

                    <div className="flex justify-between items-center group">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Currency Settings</h4>
                            <p className="text-[10px] text-on-surface-variant opacity-40 uppercase tracking-widest">Base: INR (₹)</p>
                        </div>
                        <span className="text-[10px] border border-on-surface-variant/20 px-2 py-1 rounded text-primary opacity-60">
                            Change
                        </span>
                    </div>
                </Card>
            </div>
        </section>

        {/* Danger Zone (Minimalist) */}
        <section className="pt-12 border-t border-on-surface-variant/5">
            <div className="flex flex-col md:flex-row justify-between items-center bg-surface-container-lowest border border-on-surface-variant/10 rounded-2xl p-8 gap-8">
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-sm tracking-widest font-bold uppercase text-on-surface-variant/40">
                        Session Termination
                    </h3>
                    <p className="text-[10px] text-on-surface-variant/30 leading-relaxed font-inter uppercase">
                        Clearing local access tokens and terminating existing obsidian session.
                    </p>
                </div>
                <Button 
                    variant="error" 
                    className="flex items-center gap-3 w-full md:w-auto justify-center"
                    onClick={onLogout}
                >
                    <LogOut size={16} /> De-Initialize
                </Button>
            </div>
            
            {/* Versioning Footnote */}
            <div className="mt-12 text-center">
                <span className="text-[10px] text-on-surface-variant/20 uppercase tracking-[0.4em] font-medium leading-loose font-mono">
                    System Identity: 0x909766 // Obsidian Build // Prod V.1
                </span>
            </div>
        </section>
      </div>
    </Layout>
  );
};
