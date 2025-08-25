import React from 'react';
import { motion } from 'framer-motion';

interface StatusBarProps {
    isRunning: boolean;
    progress: number;
    currentStage: string | null;
    statusMessage: string | null;
    error: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ 
    isRunning, 
    progress, 
    currentStage, 
    statusMessage, 
    error 
}) => {
    const displayProgress = isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));

    return (
        <div className="w-full space-y-4">
            {/* Status Chips */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Verbindung / Laufstatus */}
                <span
                    className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md border shadow ${
                        isRunning ? 'bg-green-500/20 border-green-400/40 text-green-200' : 'bg-gray-500/20 border-gray-400/40 text-gray-200'
                    }`}
                >
                    {isRunning ? 'Backend aktiv' : 'Backend bereit'}
                </span>

                {/* Fortschritt nur anzeigen, wenn >0 && running */}
                {isRunning && displayProgress > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md bg-blue-500/20 border border-blue-400/40 text-blue-200">
                        {displayProgress.toFixed(0)}% erledigt
                    </span>
                )}

                {/* Fehlerchip */}
                {error && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md bg-red-500/30 border border-red-400/50 text-red-200 flex items-center space-x-1">
                        <span>❌ Fehler</span>
                    </span>
                )}
            </div>
            
            {/* Status Messages */}
            <div className="space-y-2">
                {currentStage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2"
                    >
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-blue-200/90 text-sm font-medium">{currentStage}</span>
                    </motion.div>
                )}
                
                {statusMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white/90 text-sm"
                    >
                        {statusMessage}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StatusBar; 