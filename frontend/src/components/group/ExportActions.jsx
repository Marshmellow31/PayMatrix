import React, { useState } from 'react';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToPDF, exportToCSV } from '../../utils/exportUtils';

const ExportActions = ({ group, expenses, balances, iconOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type) => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        exportToPDF(group, expenses, balances);
      } else {
        exportToCSV(group, expenses);
      }
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setIsOpen(false);
      }, 800);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center rounded-xl bg-surface-container-high border border-outline-variant/10 text-on-surface hover:bg-surface-variant transition-all text-sm font-medium ${
          iconOnly ? 'w-11 h-11 p-0' : 'gap-2 px-4 py-2 h-11'
        }`}
        title="Export Data"
      >
        <Download size={iconOnly ? 18 : 16} />
        {!iconOnly && (
          <>
            Export
            <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-on-surface">PDF Report</span>
                    <span className="text-[10px] text-on-surface-variant/60">Formatted Summary</span>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                    <Table size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-on-surface">CSV Data</span>
                    <span className="text-[10px] text-on-surface-variant/60">Raw Transactions</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportActions;
