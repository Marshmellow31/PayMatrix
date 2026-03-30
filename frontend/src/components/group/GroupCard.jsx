import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiUserGroup } from 'react-icons/hi';
import { GROUP_CATEGORIES } from '../../utils/constants.js';

const GroupCard = ({ group }) => {
  const category = GROUP_CATEGORIES.find((c) => c.value === group.category);

  return (
    <Link to={`/groups/${group._id}`}>
      <motion.div
        className="glass-card hover:bg-surface-container-highest transition-colors cursor-pointer relative overflow-hidden group min-h-[180px] flex flex-col justify-between"
        whileHover={{ scale: 0.98 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-surface-lowest"
            style={{ background: `${category?.color || '#ffffff'}10` }}
          >
            {category?.label?.split(' ')[0] || '📌'}
          </div>
          <div className="chip bg-surface-container-lowest text-on-surface">
            <HiUserGroup size={14} className="opacity-70" />
            <span className="font-inter font-semibold">{group.members?.length || 0}</span>
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="text-xl font-bold font-manrope text-primary mb-1 truncate tracking-tight group-hover:text-secondary transition-colors">
            {group.title}
          </h3>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold font-inter">
            {group.category}
          </p>
        </div>
        
        {/* Subtle hover gradient interaction */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </motion.div>
    </Link>
  );
};

export default GroupCard;
