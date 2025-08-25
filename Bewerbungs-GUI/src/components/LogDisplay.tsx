import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogDisplayProps {
    logs: string[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState<'all' | 'error' | 'success' | 'warning' | 'info'>('all');
    const [isExpanded, setIsExpanded] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isExpanded) {
            endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isExpanded]);

    const getLogType = (log: string) => {
        // Rate limit and quota messages should be warnings, not errors
        if (log.includes('rate/quota limit') || log.includes('queries_quota') || log.includes('OVER_QUERY_LIMIT')) return 'warning';
        
        // True errors
        if (log.includes('ERROR') || log.includes('Failed') || log.includes('Error')) return 'error';
        
        // Success messages
        if (log.includes('SUCCESS') || log.includes('Completed') || log.includes('✓')) return 'success';
        
        // Warning messages
        if (log.includes('WARNING') || log.includes('Warning') || log.includes('⚠️')) return 'warning';
        
        // Info messages
        if (log.includes('INFO') || log.includes('Starting') || log.includes('Processing')) return 'info';
        
        return 'info';
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'error': return '❌';
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📝';
        }
    };

    const getLogColor = (type: string) => {
        switch (type) {
            case 'error': return 'border-red-400/30 bg-red-500/10 text-red-300';
            case 'success': return 'border-green-400/30 bg-green-500/10 text-green-300';
            case 'warning': return 'border-yellow-400/30 bg-yellow-500/10 text-yellow-300';
            case 'info': return 'border-blue-400/30 bg-blue-500/10 text-blue-300';
            default: return 'border-gray-400/30 bg-gray-500/10 text-gray-300';
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === 'all' || getLogType(log) === filter;
        const matchesSearch = searchTerm === '' || log.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const logCounts = {
        all: logs.length,
        error: logs.filter(log => getLogType(log) === 'error').length,
        success: logs.filter(log => getLogType(log) === 'success').length,
        warning: logs.filter(log => getLogType(log) === 'warning').length,
        info: logs.filter(log => getLogType(log) === 'info').length,
    };

    if (logs.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
            >
                <motion.div
                    animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="text-8xl mb-6"
                >
                    📋
                </motion.div>
                <h3 className="text-2xl font-bold text-white/90 mb-3">Keine Logs verfügbar</h3>
                <p className="text-blue-200/70 text-lg max-w-md">
                    Starte die Jobsuche um Logs zu sehen!
                </p>
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-6 px-4 py-2 bg-white/10 rounded-full text-sm text-blue-200/80 backdrop-blur-sm border border-white/20"
                >
                    ⏳ Warten auf Aktivität
                </motion.div>
            </motion.div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header with Controls */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white/90 flex items-center space-x-2">
                        <span>📋</span>
                        <span>System Logs ({logs.length})</span>
                    </h3>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-3 py-1 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white text-sm transition-all duration-200"
                    >
                        {isExpanded ? '📄 Kompakt' : '📖 Erweitert'}
                    </motion.button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Logs durchsuchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 backdrop-blur-sm transition-all duration-200"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200/60">
                        🔍
                    </div>
                    {searchTerm && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-200/60 hover:text-white"
                        >
                            ✕
                        </motion.button>
                    )}
                </div>

                {/* Filter Buttons */}
                <div className="flex space-x-2">
                    {(['all', 'error', 'warning', 'success', 'info'] as const).map((filterType) => (
                        <motion.button
                            key={filterType}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFilter(filterType)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                filter === filterType
                                    ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                                    : 'bg-white/10 border-white/20 text-blue-200/70 hover:bg-white/20'
                            } border backdrop-blur-sm`}
                        >
                            {filterType === 'all' && `📝 Alle (${logCounts.all})`}
                            {filterType === 'error' && `❌ Fehler (${logCounts.error})`}
                            {filterType === 'warning' && `⚠️ Warnung (${logCounts.warning})`}
                            {filterType === 'success' && `✅ Erfolg (${logCounts.success})`}
                            {filterType === 'info' && `ℹ️ Info (${logCounts.info})`}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Logs Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl overflow-hidden"
            >
                <div className="h-full overflow-y-auto p-4 space-y-2">
                    <AnimatePresence>
                        {filteredLogs.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8 text-blue-200/60"
                            >
                                {searchTerm ? (
                                    <>
                                        <div className="text-4xl mb-3">🔍</div>
                                        <p>Keine Logs gefunden für "{searchTerm}"</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-4xl mb-3">📂</div>
                                        <p>Keine {filter === 'all' ? '' : filter} Logs vorhanden</p>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            filteredLogs.map((log, index) => {
                                const logType = getLogType(log);
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`p-3 rounded-xl border backdrop-blur-sm ${getLogColor(logType)} ${
                                            isExpanded ? 'min-h-[3rem]' : 'min-h-[2rem]'
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <span className="text-lg flex-shrink-0 mt-0.5">
                                                {getLogIcon(logType)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${isExpanded ? 'leading-relaxed' : 'truncate'} font-mono`}>
                                                    {log}
                                                </p>
                                                {isExpanded && (
                                                    <div className="text-xs opacity-60 mt-1">
                                                        {new Date().toLocaleTimeString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                    <div ref={endOfLogsRef} />
                </div>
            </motion.div>
        </div>
    );
};

export default LogDisplay; 