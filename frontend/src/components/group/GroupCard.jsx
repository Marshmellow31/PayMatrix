import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GROUP_CATEGORIES } from '../../utils/constants.js';

const GroupCard = ({ group }) => {
  const category = GROUP_CATEGORIES.find((c) => c.value === group.category);
  const IconComponent = category?.icon ? LucideIcons[category.icon] || Hash : Hash;

  // De-duplicate members by user ID
  const uniqueMembers = Array.from(new Map(
    (group.members || []).map(m => {
      const u = m.user || m;
      const id = (u?._id || u?.uid || u || '').toString();
      return [id, m];
    })
  ).values());

  // Simulate a balance since it's not currently provided by the list API
  // In a real scenario, this would be computed or part of the group object
  const balance = group.balance || 0; 

  return (
    <Link to={`/groups/${group._id}`} className="block">
      <motion.div
        className="glass-card p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-neutral-800/50 group cursor-pointer border border-white/5 relative overflow-hidden"
        whileHover={{ scale: 0.995 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      >
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h3 className="font-headline text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors tracking-tight">
              {group.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant text-[10px] font-bold tracking-[0.15em] uppercase opacity-60">
                {group.category} • {uniqueMembers.length} Members
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-on-surface-variant text-[10px] font-bold tracking-[0.15em] uppercase mb-1 opacity-60">
              Your Balance
            </p>
            <p className={`font-headline text-xl font-bold ${balance >= 0 ? 'text-white' : 'text-error'}`}>
              {balance >= 0 ? '+' : ''}{group.currency || '₹'}{Math.abs(balance).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="flex -space-x-2">
            {uniqueMembers.slice(0, 3).map((member, idx) => (
              <div 
                key={member.user?._id || idx} 
                className="w-8 h-8 rounded-full border-2 border-surface-container-low overflow-hidden bg-surface-container-high shadow-lg"
              >
                {member.user?.avatar ? (
                  <img 
                    src={member.user.avatar} 
                    alt={member.user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-surface-container-highest">
                    {member.user?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            ))}
            {uniqueMembers.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center shadow-lg">
                <span className="text-[10px] font-bold text-white">+{uniqueMembers.length - 3}</span>
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container-high/50 flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
            <LucideIcons.ChevronRight size={16} className="text-on-surface-variant group-hover:text-on-primary" />
          </div>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </Link>
  );
};

export default GroupCard;
