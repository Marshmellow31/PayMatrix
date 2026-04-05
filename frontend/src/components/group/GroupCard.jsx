import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GROUP_CATEGORIES } from '../../utils/constants.js';
import Avatar from '../common/Avatar.jsx';
import { getInitials } from '../../utils/nameUtils.js';

const GroupCard = ({ group, balance = 0 }) => {
  const category = GROUP_CATEGORIES.find((c) => c.value === group.category);
  const IconComponent = category?.icon ? LucideIcons[category.icon] || Hash : Hash;

  // De-duplicate members by user ID (handles both raw UIDs and expanded objects)
  const uniqueMembers = Array.from(new Map(
    (group.members || []).map(m => {
      const u = m.user || m;
      const id = typeof u === 'string' ? u : (u?._id || u?.uid || '').toString();
      return [id, m];
    })
  ).values());

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
              {group.name || group.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant text-[10px] font-bold tracking-[0.15em] uppercase opacity-60">
                {group.category} • {uniqueMembers.length} Members
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-on-surface-variant text-[10px] font-black tracking-[0.2em] uppercase mb-1 flex items-center justify-end gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Your Balance
            </p>
            <p className={`font-headline text-2xl font-black ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {balance >= 0 ? '+' : '-'}{group.currency || '₹'}{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center relative z-10 pt-2">
          <div className="flex -space-x-3 items-center">
            {uniqueMembers.slice(0, 3).map((member, idx) => {
              const u = member.user || (typeof member === 'string' ? null : member);
              const name = u?.name || '';
              const src = u?.avatar || '';
              const id = u?._id || (typeof member === 'string' ? member : idx);

              return (
                <div key={id} className="relative transition-transform duration-300 hover:z-20 hover:-translate-y-0.5">
                  <Avatar
                    name={name}
                    src={src}
                    size="sm"
                    className="shadow-xl"
                  />
                </div>
              );
            })}
            {uniqueMembers.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shadow-xl z-0 transition-transform duration-300 hover:-translate-y-0.5">
                <span className="text-[10px] font-black text-white/90 font-manrope">+{uniqueMembers.length - 3}</span>
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
