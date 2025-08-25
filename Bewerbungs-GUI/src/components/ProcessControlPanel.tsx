import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessStatus {
  status: 'idle' | 'running' | 'paused' | 'cancelled' | 'completed' | 'error';
  is_running: boolean;
  can_cancel: boolean;
  can_restart: boolean;
  timestamp: string;
}

interface ProcessControlPanelProps {
  onProcessChange?: (status: ProcessStatus) => void;
}

const ProcessControlPanel: React.FC<ProcessControlPanelProps> = ({ onProcessChange }) => {
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({
    status: 'idle',
    is_running: false,
    can_cancel: false,
    can_restart: true,
    timestamp: new Date().toISOString()
  });
  
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false); // Start with polling disabled

  // Poll process status periodically - ONLY when needed
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/process/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProcessStatus(data.status);
            onProcessChange?.(data.status);
          }
        }
      } catch (error) {
        // API doesn't exist - don't spam console with errors
        // Only log once for debugging
        if (!window.processStatusErrorLogged) {
          console.warn('Process status API not available - disabling polling');
          window.processStatusErrorLogged = true;
        }
        // Set to idle status to prevent further polling
        setProcessStatus(prev => ({ ...prev, status: 'idle', is_running: false }));
      }
    };

    // Only poll if explicitly enabled and there might be a running process
    if (pollingEnabled && (processStatus.is_running || processStatus.status === 'running')) {
      // Initial fetch
      fetchStatus();

      // Poll every 5 seconds when running (reduced frequency)
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [onProcessChange, processStatus.is_running, processStatus.status, pollingEnabled]);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/process/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Process cancelled successfully');
        }
      }
    } catch (error) {
      console.error('Failed to cancel process:', error);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const handleRestart = async (params: any = {}) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/process/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Process restarted successfully');
        }
      }
    } catch (error) {
      console.error('Failed to restart process:', error);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const handleRewrite = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/process/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_last_cache: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Process rewrite requested');
        }
      }
    } catch (error) {
      console.error('Failed to rewrite process:', error);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'cancelled': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'cancelled': return '⏹️';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white/90 flex items-center space-x-2">
          <span>🎮</span>
          <span>Process Control</span>
        </h3>
        
        {/* Status Indicator */}
        <motion.div
          animate={{ scale: processStatus.is_running ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 2, repeat: processStatus.is_running ? Infinity : 0 }}
          className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 ${getStatusColor(processStatus.status)}`}
        >
          <span className="text-lg">{getStatusIcon(processStatus.status)}</span>
          <span className="text-sm font-medium capitalize">{processStatus.status}</span>
        </motion.div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {/* Cancel Button */}
        <motion.button
          whileHover={{ scale: processStatus.can_cancel ? 1.05 : 1 }}
          whileTap={{ scale: processStatus.can_cancel ? 0.95 : 1 }}
          disabled={!processStatus.can_cancel || isLoading}
          onClick={() => setShowConfirmDialog('cancel')}
          className={`
            relative overflow-hidden p-4 rounded-xl border transition-all duration-300
            ${processStatus.can_cancel 
              ? 'bg-red-500/20 border-red-400/30 hover:bg-red-500/30 text-red-300 hover:text-red-200' 
              : 'bg-gray-500/10 border-gray-500/20 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl">🛑</span>
            <span className="text-sm font-medium">Cancel</span>
          </div>
        </motion.button>

        {/* Restart Button */}
        <motion.button
          whileHover={{ scale: processStatus.can_restart ? 1.05 : 1 }}
          whileTap={{ scale: processStatus.can_restart ? 0.95 : 1 }}
          disabled={!processStatus.can_restart || isLoading}
          onClick={() => setShowConfirmDialog('restart')}
          className={`
            relative overflow-hidden p-4 rounded-xl border transition-all duration-300
            ${processStatus.can_restart 
              ? 'bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200' 
              : 'bg-gray-500/10 border-gray-500/20 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-medium">Restart</span>
          </div>
        </motion.button>

        {/* Rewrite Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
          onClick={() => setShowConfirmDialog('rewrite')}
          className="
            relative overflow-hidden p-4 rounded-xl border transition-all duration-300
            bg-purple-500/20 border-purple-400/30 hover:bg-purple-500/30 
            text-purple-300 hover:text-purple-200
          "
        >
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl">✏️</span>
            <span className="text-sm font-medium">Rewrite</span>
          </div>
        </motion.button>
      </div>

      {/* Status Information */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10"
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-200/70">Last Update:</span>
            <div className="text-white/90">
              {new Date(processStatus.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div>
            <span className="text-blue-200/70">Thread Status:</span>
            <div className="text-white/90">
              {processStatus.is_running ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialogs */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900/95 border border-white/20 rounded-2xl p-6 max-w-md mx-4"
            >
              <h4 className="text-xl font-bold text-white mb-4">
                Confirm {showConfirmDialog.charAt(0).toUpperCase() + showConfirmDialog.slice(1)}
              </h4>
              
              <p className="text-blue-200/80 mb-6">
                {showConfirmDialog === 'cancel' && 'Are you sure you want to cancel the current job search process?'}
                {showConfirmDialog === 'restart' && 'Are you sure you want to restart the job search process?'}
                {showConfirmDialog === 'rewrite' && 'Are you sure you want to rewrite the last search with new parameters?'}
              </p>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 py-2 px-4 bg-gray-600/50 text-white rounded-lg hover:bg-gray-600/70 transition-colors"
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Enable polling when user starts an action
                    setPollingEnabled(true);
                    if (showConfirmDialog === 'cancel') handleCancel();
                    else if (showConfirmDialog === 'restart') handleRestart();
                    else if (showConfirmDialog === 'rewrite') handleRewrite();
                  }}
                  className={`
                    flex-1 py-2 px-4 rounded-lg transition-colors font-medium
                    ${showConfirmDialog === 'cancel' 
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : showConfirmDialog === 'restart'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }
                  `}
                >
                  {showConfirmDialog.charAt(0).toUpperCase() + showConfirmDialog.slice(1)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProcessControlPanel;