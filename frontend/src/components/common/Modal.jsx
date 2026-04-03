import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!mounted) return null;
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className={`relative w-full ${sizes[size]} bg-[#1a1a1a] rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 z-10 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]`}
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0 z-20">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold font-manrope text-white tracking-tight uppercase">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/5 transition-all text-on-surface-variant hover:text-white active:scale-95"
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
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
