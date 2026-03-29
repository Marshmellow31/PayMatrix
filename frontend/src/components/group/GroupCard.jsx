import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiUserGroup } from 'react-icons/hi';
import { GROUP_CATEGORIES } from '../../utils/constants.js';

const GroupCard = ({ group }) => {
  const category = GROUP_CATEGORIES.find((c) => c.value === group.category);

  return (
    <Link to={`/groups/${group._id}`}>
      <motion.div
        className="elevated-card hover:bg-surface-container-highest transition-colors cursor-pointer"
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${category?.color || '#919191'}15` }}
          >
            {category?.label?.split(' ')[0] || '📌'}
          </div>
          <div className="flex items-center gap-1 chip">
            <HiUserGroup size={14} />
            <span>{group.members?.length || 0}</span>
          </div>
        </div>

        <h3 className="text-base font-semibold font-manrope text-on-surface mb-1 truncate">
          {group.title}
        </h3>
        <p className="text-xs text-on-surface-variant capitalize">
          {group.category}
        </p>
      </motion.div>
    </Link>
  );
};

export default GroupCard;
