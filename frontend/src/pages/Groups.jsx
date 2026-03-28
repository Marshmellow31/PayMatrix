import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getGroups, reset } from "../redux/slices/groupSlice";
import { Layout } from "../components/layout/Layout";
import { Card, Button } from "../components/common";
import { 
  Users as UsersIcon, 
  Search, 
  Map, 
  Home, 
  Heart,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Groups = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { groups } = useSelector((state) => state.groups);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(getGroups());
    return () => dispatch(reset());
  }, [dispatch]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (category) => {
    switch (category) {
      case 'Trip': return <Map size={24} />;
      case 'Home': return <Home size={24} />;
      case 'Couple': return <Heart size={24} />;
      default: return <UsersIcon size={24} />;
    }
  };

  return (
    <Layout>
      <div className="space-y-10">
        {/* Header and Search */}
        <section className="space-y-6 pt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-manrope font-bold text-primary tracking-tight">Your Portfolio</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-full text-[10px] uppercase font-bold tracking-widest hover:scale-105 transition-transform">
                <Plus size={14} strokeWidth={3} /> Create Group
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Filter Obsidian Assets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low/50 border border-on-surface-variant/5 hover:border-on-surface-variant/10 focus:border-primary/20 rounded-full pl-16 pr-8 py-5 outline-none text-sm transition-all font-medium"
            />
          </div>
        </section>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, i) => (
              <Card 
                key={group._id} 
                className="group relative overflow-hidden cursor-pointer" 
                hover
                onClick={() => navigate(`/groups/${group._id}`)}
              >
                <div className="absolute top-0 right-0 p-4">
                  <span className="text-[10px] font-bold text-on-surface-variant/20 uppercase font-mono">
                    ID: {group.inviteCode}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-surface-container-highest/50 rounded-2xl flex items-center justify-center text-primary/40 group-hover:bg-primary group-hover:text-background transition-all duration-500 shadow-xl">
                        {getIcon(group.category)}
                      </div>
                      <div>
                        <h3 className="font-manrope font-bold text-lg text-primary tracking-tight">{group.name}</h3>
                        <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-[0.2em] font-bold font-inter italic">
                          {group.category} pipeline
                        </p>
                      </div>
                  </div>

                  <div className="flex justify-between items-end pt-6 border-t border-on-surface-variant/5">
                    <div className="flex -space-x-2">
                      {group.members?.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="w-9 h-9 rounded-full border-2 border-surface-container-high bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shadow-lg">
                           {m.name?.charAt(0)}
                        </div>
                      ))}
                      {group.members?.length > 3 && (
                          <div className="w-9 h-9 rounded-full border-2 border-surface-container-high bg-surface-container-highest flex items-center justify-center text-[10px] text-on-surface-variant font-bold shadow-lg">
                              +{group.members.length - 3}
                          </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary opacity-60 uppercase tracking-widest">
                        Settled
                      </p>
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant/20 tracking-widest leading-none">
                        Current Status
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            ))
          ) : (
             <div className="col-span-full py-20 text-center space-y-4 opacity-30">
               <UsersIcon className="mx-auto" size={48} />
               <p className="text-[10px] uppercase font-bold tracking-[0.4em]">No active groups detected in the network.</p>
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
