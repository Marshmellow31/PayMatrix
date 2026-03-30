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
            className={`relative w-full ${sizes[size]} bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border border-outline-variant/10 z-10 overflow-hidden`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6">
              <h2 className="text-2xl font-bold font-manrope text-primary tracking-tight">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors text-on-surface-variant"
                aria-label="Close modal"
              >
                <HiX size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 pb-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
