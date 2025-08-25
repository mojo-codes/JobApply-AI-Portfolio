import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'yellow' | 'blue' | 'green';
  onConfirm: () => void;
  onCancel: () => void;
  jobTitle?: string | null; // Optional job title for context
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  confirmButtonColor = 'red',
  onConfirm,
  onCancel,
  jobTitle
}) => {
  if (!isOpen) return null;

  const getButtonColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20';
      case 'yellow':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20';
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20';
      case 'green':
        return 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20';
      default:
        return 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white mb-2">
                {title}
              </h2>
              <p className="text-white/70">
                {message}
              </p>
              {jobTitle && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-white/90 font-medium text-sm">
                    📋 Job: {jobTitle}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 flex items-center justify-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                {cancelText}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onConfirm}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${getButtonColorClasses(confirmButtonColor)}`}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;