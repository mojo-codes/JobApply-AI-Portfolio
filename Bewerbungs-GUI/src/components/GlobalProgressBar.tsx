import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalProgressBarProps {
  progress: number; // 0-100
  isRunning: boolean;
}

/**
 * Fixed top progress bar that visualises backend workflow progress.
 * – Animates width with framer-motion
 * – Gradient amber→emerald
 * – Auto-hides 1 s after reaching 100 %
 */
export default function GlobalProgressBar({ progress, isRunning }: GlobalProgressBarProps) {
  const [visible, setVisible] = useState(false);

  // Clamp progress
  const pct = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    if (isRunning && pct > 0 && pct < 100) {
      setVisible(true);
    }
    if (pct >= 100) {
      setVisible(true); // ensure it's shown at 100 %
      const timer = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [pct, isRunning]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="progressBar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-0 left-0 w-full h-1 z-40">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 20 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
} 