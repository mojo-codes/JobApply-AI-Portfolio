import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ManualJobModalProps {
  visible: boolean;
  onSubmit: (input: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  activeCareerProfile?: { profile_name: string; description?: string } | null;
}

const ManualJobModal: React.FC<ManualJobModalProps> = ({ 
  visible, 
  onSubmit, 
  onCancel, 
  isProcessing = false,
  activeCareerProfile
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleCancel = () => {
    setInput('');
    onCancel();
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl shadow-glass border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    📝 Manuelle Stellenausschreibung
                  </h2>
                  <p className="text-blue-200/70">
                    Kopiere die vollständige Stellenausschreibung hier ein
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                  disabled={isProcessing}
                >
                  ✕
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Active Career Profile Display */}
              {activeCareerProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-3 border border-green-400/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-white/90 font-medium">Aktives Career-Profil:</span>
                      <span className="text-white font-semibold">{activeCareerProfile.profile_name}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        // Deactivate career profile
                        // This would need to be passed as a prop from parent
                        alert('Career-Profil deaktivieren - Feature kommt bald!');
                      }}
                      className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                      title="Career-Profil deaktivieren"
                    >
                      ✕
                    </motion.button>
                  </div>
                  {activeCareerProfile.description && (
                    <p className="text-xs text-white/60 mt-1 line-clamp-1">{activeCareerProfile.description}</p>
                  )}
                </motion.div>
              )}

              {/* Input Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">
                  Stellenausschreibung
                </label>
                <textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Hier die vollständige Stellenausschreibung einfügen..."
                  className="w-full h-48 p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200"
                  disabled={isProcessing}
                />
              </div>

              {/* Usage Examples */}
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
                  💡 Tipp
                </h4>
                <div className="text-xs text-white/60 space-y-1">
                  <div><strong>Vollständige Stellenausschreibung:</strong> Kopiere den kompletten Text aus dem Job-Portal für beste Ergebnisse.</div>
                  <div><strong>Dein Career-Profil:</strong> Wird automatisch in die Bewerbung eingearbeitet.</div>
                </div>
              </div>

              {/* Processing Indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                  />
                  <span className="text-blue-300">
                    Erstelle Bewerbung mit Career-Profil...
                  </span>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/20 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
                disabled={isProcessing}
              >
                Abbrechen
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!input.trim() || isProcessing}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  input.trim() && !isProcessing
                    ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg'
                    : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                }`}
              >
                {isProcessing ? 'Verarbeite...' : 'Bewerbung erstellen'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ManualJobModal; 