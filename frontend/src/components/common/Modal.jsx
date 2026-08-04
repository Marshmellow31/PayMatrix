import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { registerBackHandler } from '../../platform/backNavigation.js';

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

  useEffect(() => {
    if (!isOpen) return undefined;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 100);
  }, [isOpen, onClose]);

  if (!mounted) return null;
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    xl: 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    '5xl': 'max-w-7xl',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 native-modal-shell">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Outer shell: handles open/close pop animation only */}
          <motion.div
            className={`relative w-full ${sizes[size]}`}
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          >
            {/* Inner shell: handles height layout resize independently */}
            <motion.div
              layout
              className="bg-[#1a1a1a] rounded-3xl sm:rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 z-10 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] lg:max-h-[88vh]"
              transition={{ layout: { type: 'spring', damping: 26, stiffness: 210 } }}
            >
              {/* Header - Fixed */}
              <div className="flex items-center justify-between px-5 sm:px-8 pt-6 sm:pt-8 pb-3 sm:pb-4 shrink-0 z-20">
                <div className="flex flex-col">
                  <h2 className="text-lg sm:text-xl font-bold font-manrope text-white tracking-tight uppercase">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/5 transition-all text-on-surface-variant hover:text-white active:scale-95"
                  aria-label="Close modal"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Body - Scrollable */}
              <div className="px-5 sm:px-8 pb-6 sm:pb-10 pt-2 sm:pt-4 overflow-y-auto custom-scrollbar flex-1">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
