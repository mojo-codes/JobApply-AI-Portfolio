import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogDisplay from './LogDisplay';

interface LogModalProps {
  visible: boolean;
  logs: string[];
  onClose: () => void;
}

const LogModal: React.FC<LogModalProps> = ({ visible, logs, onClose }) => {
  // ESC schließt Modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal Container */}
          <motion.div
            className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/20 rounded-2xl shadow-xl w-[90vw] max-w-5xl h-[90vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white">System-Logs</h2>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
              >
                ✕ Schließen
              </button>
            </div>
            {/* Log Content */}
            <div className="flex-1 overflow-hidden">
              <LogDisplay logs={logs} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LogModal; 