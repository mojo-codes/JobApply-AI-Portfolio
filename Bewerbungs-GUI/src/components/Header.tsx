import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    onConfigClick: () => void;
    isRunning: boolean;
}

const Header: React.FC<HeaderProps> = ({ onConfigClick, isRunning }) => {
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const handleExitApp = () => {
        setShowExitConfirmation(true);
    };

    const confirmExit = async () => {
        try {
            const { invoke } = await import('@tauri-apps/api/tauri');
            await invoke('exit_application');
        } catch (error) {
            console.error('Error exiting application:', error);
        }
    };

    const cancelExit = () => {
        setShowExitConfirmation(false);
    };

    return (
        <>
            <header className="p-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-glass border border-white/20"
                >
                    <div className="flex items-center justify-between">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center space-x-4"
                        >
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                                    Bewerbungshelfer GUI
                                </h1>
                                <p className="text-blue-200/80 text-sm">Live Job Search & Application Agent</p>
                            </div>
                        </motion.div>
                        
                        <div className="flex items-center space-x-3">
                            {/* Status Indicator */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center space-x-2"
                            >
                                <div className={`w-3 h-3 rounded-full ${
                                    isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                                } shadow-lg`} />
                                <span className="text-white/80 text-sm font-medium">
                                    {isRunning ? 'Aktiv' : 'Bereit'}
                                </span>
                            </motion.div>

                            {/* Config Button */}
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onConfigClick}
                                className="w-12 h-12 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg"
                                title="Einstellungen"
                            >
                                <span className="text-xl">⚙️</span>
                            </motion.button>

                            {/* Exit Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleExitApp}
                                className="w-12 h-12 backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg"
                                title="Anwendung beenden"
                            >
                                <span className="text-xl">🚪</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* Exit Confirmation Dialog */}
            <AnimatePresence>
                {showExitConfirmation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={cancelExit}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🚪</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Anwendung beenden?
                                </h3>
                                <p className="text-white/70 mb-6">
                                    Möchten Sie die Bewerbungshelfer-Anwendung wirklich beenden?
                                    Alle laufenden Prozesse werden gestoppt.
                                </p>
                                <div className="flex space-x-3">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={cancelExit}
                                        className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white font-medium transition-all duration-200"
                                    >
                                        Abbrechen
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={confirmExit}
                                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-white font-medium transition-all duration-200"
                                    >
                                        Beenden
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Header; 