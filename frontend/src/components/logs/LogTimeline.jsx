import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Hash, Users, Pencil, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

const dayLabel = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const groupByDay = (entries) => {
  const groups = [];
  let currentKey = null;
  entries.forEach((entry) => {
    const key = dayLabel(entry.date);
    if (key !== currentKey) {
      groups.push({ key, entries: [] });
      currentKey = key;
    }
    groups[groups.length - 1].entries.push(entry);
  });
  return groups;
};

const LogTimeline = ({ entries, currentUid, isOwner = false, showAuthor = false, onEdit, onDelete }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="py-20 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
        <p className="text-sm text-white/20 font-medium">No entries yet</p>
      </div>
    );
  }

  const dayGroups = groupByDay(entries);
  let idx = 0;

  return (
    <div className="space-y-6">
      {dayGroups.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] px-1">
            {group.key}
          </p>
          <div className="space-y-2">
            {group.entries.map((entry) => {
              const i = idx++;
              const cat = EXPENSE_CATEGORIES.find((c) => c.value === entry.category);
              const IconComp = cat?.icon ? LucideIcons[cat.icon] || Hash : Hash;
              const iconColor = cat?.color || '#919191';
              const isExpense = entry.type === 'expense';
              const isMine = entry.addedBy === currentUid;
              const canDelete = isMine || isOwner;
              const canEdit = !isExpense && canDelete;

              return (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 flex items-center justify-between transition-all duration-300 shadow-xl"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-white/5"
                      style={{ color: iconColor }}
                    >
                      <IconComp size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-base font-black text-white font-manrope truncate">
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isExpense ? (
                          <span className="text-[9px] font-black tracking-[0.2em] truncate text-indigo-400/70 flex items-center gap-1">
                            <Users size={9} /> {entry.sourceGroupName?.toUpperCase() || 'GROUP SPLIT'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black tracking-[0.2em] truncate text-white/30">
                            {entry.place || 'MANUAL ENTRY'}
                          </span>
                        )}
                        {showAuthor && entry.addedByName && (
                          <span className="text-[9px] font-black tracking-[0.15em] text-white/15 truncate">
                            · {isMine ? 'YOU' : entry.addedByName.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <p className="text-lg sm:text-xl font-black font-manrope whitespace-nowrap text-white">
                      {formatCurrency(entry.amount)}
                    </p>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => onEdit?.(entry)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete?.(entry)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogTimeline;
