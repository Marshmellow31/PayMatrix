import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            className={`relative w-full ${sizes[size]} bg-neutral-900/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border border-white/5 z-10 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0 bg-neutral-900/40 backdrop-blur-md z-20">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-manrope text-white tracking-tight">
                  {title}
                </h2>
                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-on-surface-variant hover:text-white"
                aria-label="Close modal"
              >
                <HiX size={20} />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="px-8 pb-10 pt-4 overflow-y-auto custom-scrollbar flex-1">{children}</div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
