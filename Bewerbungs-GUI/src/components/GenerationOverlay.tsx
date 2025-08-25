import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingTips } from "../hooks/useLoadingTips";

interface GenerationOverlayProps {
  active: boolean;
  current: number;
  total: number;
  message?: string | null;
}

export const GenerationOverlay: React.FC<GenerationOverlayProps> = ({ active, current, total, message }) => {
  const tip = useLoadingTips();
  if (!active) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl px-10 py-8 border border-white/20 shadow-2xl text-center"
          >
            <div className="flex flex-col items-center gap-4 w-64">
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 008-8h-4l3 3 3-3h-4a8 8 0 01-8 8 8 8 0 01-8-8z" />
              </svg>
              <p className="text-white text-lg font-semibold">Erstelle Bewerbung {current} / {total}</p>
              {message && (
                <p className="mt-3 text-white/70 text-sm max-w-xs mx-auto whitespace-pre-line">
                  {message}
                </p>
              )}
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-white font-medium">{tip}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 