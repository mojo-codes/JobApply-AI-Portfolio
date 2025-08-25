import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Job } from '../hooks/useJobAgent';

interface JobDisplayProps {
    jobs: Job[];
    mlWeight?: number; // 0..100
    sortByAmpel?: boolean; // Sort by Ampel priority
    onHideJob?: (jobId: string) => void;
    onDeleteJob?: (jobId: string) => void;
    onUnhideJob?: (jobId: string) => void;
    showHiddenJobs?: boolean;
    ageFilter?: {
        enabled: boolean;
        maxDays: number;
        onToggle: (enabled: boolean) => void;
        onMaxDaysChange: (days: number) => void;
        options: Array<{ label: string; days: number }>;
    };
    applicationStatusMap?: Record<string, any>;
    onLoadApplicationStatus?: (jobs: Job[]) => void;
    // 🎯 Confirmation Dialog Functions
    onShowDeleteConfirmation?: (jobId: string, jobTitle: string) => void;
}

const JobDisplay: React.FC<JobDisplayProps> = ({ 
    jobs, 
    mlWeight = 40, 
    sortByAmpel = true, 
    onHideJob, 
    onDeleteJob, 
    onUnhideJob, 
    showHiddenJobs = false,
    ageFilter,
    applicationStatusMap = {},
    onLoadApplicationStatus,
    // 🎯 Confirmation Dialog Functions
    onShowDeleteConfirmation
}) => {
    // 🎯 NEW: State for job details dropdown
    const [expandedJob, setExpandedJob] = useState<string | null>(null);
    const [jobDetails, setJobDetails] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

    // 🎯 NEW: Function to load job details
    const loadJobDetails = async (jobId: string) => {
        console.log('🎯 loadJobDetails called with jobId:', jobId);
        
        // Toggle dropdown
        if (expandedJob === jobId) {
            console.log('🔄 Toggling dropdown closed');
            setExpandedJob(null);
            return;
        }

        // If details already loaded, just expand
        if (jobDetails[jobId]) {
            console.log('✅ Details already loaded, expanding');
            setExpandedJob(jobId);
            return;
        }

        // Load details from API
        console.log('📡 Loading details from API...');
        setLoadingDetails(prev => new Set(prev).add(jobId));
        try {
            const response = await fetch('http://localhost:5002/api/job-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ job_id: jobId })
            });
            const data = await response.json();
            console.log('📨 API Response:', data);
            
            if (data.success) {
                setJobDetails(prev => ({ ...prev, [jobId]: data }));
                setExpandedJob(jobId);
                console.log('✅ Details loaded successfully');
            } else {
                console.error('❌ Failed to load job details:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading job details:', error);
        } finally {
            setLoadingDetails(prev => {
                const newSet = new Set(prev);
                newSet.delete(jobId);
                return newSet;
            });
        }
    };

    // Load application status when jobs change
    useEffect(() => {
        if (jobs.length > 0 && onLoadApplicationStatus) {
            onLoadApplicationStatus(jobs);
        }
    }, [jobs, onLoadApplicationStatus]);

    if (jobs.length === 0) {
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
                    🎯
                </motion.div>
                <h3 className="text-2xl font-bold text-white/90 mb-3">Noch keine Jobs gefunden</h3>
                <p className="text-blue-200/70 text-lg max-w-md">
                    Starte die Jobsuche um passende Stellenanzeigen zu finden!
                </p>
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-6 px-4 py-2 bg-white/10 rounded-full text-sm text-blue-200/80 backdrop-blur-sm border border-white/20"
                >
                    ✨ Bereit für deine Traumjobs
                </motion.div>
            </motion.div>
        );
    }

    const getAmpelColor = (ampelColor: string) => {
        switch (ampelColor) {
            case 'green':
                return 'from-green-500 to-emerald-600';
            case 'yellow':
                return 'from-yellow-500 to-orange-500';
            case 'red':
                return 'from-red-500 to-pink-600';
            default:
                return 'from-gray-500 to-gray-600';
        }
    };

    const getAmpelIcon = (ampelColor: string) => {
        switch (ampelColor) {
            case 'green':
                return '🟢';
            case 'yellow':
                return '🟡';
            case 'red':
                return '🔴';
            default:
                return '⚪';
        }
    };


    const getPlatformIcon = (platform: string) => {
        const platformLower = platform.toLowerCase();
        if (platformLower.includes('xing')) return '🔗';
        if (platformLower.includes('linkedin')) return '💼';
        if (platformLower.includes('stepstone')) return '🪜';
        if (platformLower.includes('indeed')) return '🔍';
        return '🌐';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return 'vor 1 Tag';
            if (diffDays < 7) return `vor ${diffDays} Tagen`;
            if (diffDays < 30) return `vor ${Math.ceil(diffDays / 7)} Woche${Math.ceil(diffDays / 7) > 1 ? 'n' : ''}`;
            
            return date.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        } catch {
            return dateString;
        }
    };

    // Filter jobs based on hidden status
    let filteredJobs = showHiddenJobs 
        ? jobs 
        : jobs.filter(job => !job.is_hidden);

    // Apply age filter if enabled
    if (ageFilter?.enabled && ageFilter.maxDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageFilter.maxDays);
        
        filteredJobs = filteredJobs.filter(job => {
            const jobDateString = job.date_posted || job.first_seen || job.date_added;
            if (!jobDateString) return true; // Keep jobs without date
            
            try {
                const jobDate = new Date(jobDateString);
                return jobDate >= cutoffDate;
            } catch {
                return true; // Keep jobs with invalid dates
            }
        });
    }

    // Sort jobs by Ampel priority if enabled
    const sortedJobs = sortByAmpel 
        ? [...filteredJobs].sort((a, b) => {
            const priorityA = a.ampel?.priority || 3;
            const priorityB = b.ampel?.priority || 3;
            if (priorityA !== priorityB) return priorityA - priorityB;
            // If same priority, sort by combined score
            return (b.combined_score || 0) - (a.combined_score || 0);
          })
        : filteredJobs;

    // Calculate Ampel statistics
    const ampelStats = sortedJobs.reduce((stats, job) => {
        const color = job.ampel?.color || 'red';
        stats[color] = (stats[color] || 0) + 1;
        return stats;
    }, { green: 0, yellow: 0, red: 0 } as Record<string, number>);

    // Calculate new jobs statistics
    const newJobsCount = sortedJobs.filter(job => job.is_new_since_last_search).length;

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <h3 className="text-xl font-bold text-white/90">
                    🎯 Gefundene Jobs ({jobs.length})
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                    {newJobsCount > 0 && (
                        <div className="flex items-center space-x-1">
                            <span className="animate-pulse">✨</span>
                            <span className="text-green-300 font-semibold">{newJobsCount} neu</span>
                        </div>
                    )}
                    <div className="flex items-center space-x-1">
                        <span>🟢</span>
                        <span className="text-green-300">{ampelStats.green}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span>🟡</span>
                        <span className="text-yellow-300">{ampelStats.yellow}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span>🔴</span>
                        <span className="text-red-300">{ampelStats.red}</span>
                    </div>
                </div>
            </motion.div>

            {/* Age Filter Controls */}
            {ageFilter && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-white/90 font-medium">📅 Altersfilter</span>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => ageFilter.onToggle(!ageFilter.enabled)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                    ageFilter.enabled
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/10 text-white/70'
                                }`}
                            >
                                {ageFilter.enabled ? 'Aktiviert' : 'Deaktiviert'}
                            </motion.button>
                        </div>
                        {ageFilter.enabled && (
                            <span className="text-white/60 text-sm">
                                Zeige Jobs der letzten {ageFilter.maxDays} Tage
                            </span>
                        )}
                    </div>
                    
                    {ageFilter.enabled && (
                        <div className="flex flex-wrap gap-2">
                            {ageFilter.options.map((option) => (
                                <motion.button
                                    key={option.days}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => ageFilter.onMaxDaysChange(option.days)}
                                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                        ageFilter.maxDays === option.days
                                            ? 'bg-blue-500 text-white border border-blue-400'
                                            : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                                    }`}
                                >
                                    {option.label}
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {sortedJobs.map((job, index) => {
                const combined = job.relevance_score * (100 - mlWeight) / 100 + (job.ml_score ?? 0) * 100 * mlWeight / 100;
                return (
                    <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        whileHover={{ 
                            scale: 1.02, 
                            y: -2,
                            transition: { duration: 0.2 }
                        }}
                        transition={{ 
                            layout: { duration: 0.3, ease: "easeInOut" },
                            delay: index * 0.05,
                            duration: 0.3,
                            ease: "easeOut"
                        }}
                        className="group relative"
                    >
                        {/* Glass Card */}
                        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/30">
                            {/* Top Row */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <motion.a 
                                            href={job.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            whileHover={{ scale: 1.02 }}
                                            className="font-bold text-lg text-white hover:text-blue-300 transition-colors duration-200 block leading-tight"
                                        >
                                            {job.title}
                                        </motion.a>
                                        {job.is_new_since_last_search && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                                className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
                                            >
                                                <span className="animate-pulse">✨</span>
                                                <span>NEU</span>
                                            </motion.div>
                                        )}
                                        {/* 🎯 Application Status Badge */}
                                        {(() => {
                                            const status = applicationStatusMap[String(job.id)];
                                            if (status?.has_application) {
                                                const appDate = status.application_date ? 
                                                    new Date(status.application_date).toLocaleDateString('de-DE') : '';
                                                return (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.5, delay: index * 0.1 + 0.1 }}
                                                        className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
                                                        title={`Bewerbung erstellt${appDate ? ' am ' + appDate : ''}`}
                                                    >
                                                        <span>✅</span>
                                                        <span>BEWORBEN</span>
                                                    </motion.div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div className="flex items-center space-x-3 mt-2">
                                        <span className="text-blue-200/90 font-medium">{job.company}</span>
                                        <span className="text-blue-200/60">•</span>
                                        <span className="text-blue-200/70">{job.location}</span>
                                        {(() => {
                                            const displayDate = job.date_posted || job.first_seen || job.date_added;
                                            const formattedDate = formatDate(displayDate);
                                            const dateType = job.date_posted ? "veröffentlicht" : "gefunden";
                                            
                                            return formattedDate && (
                                                <>
                                                    <span className="text-blue-200/60">•</span>
                                                    <span className="text-blue-300/80 text-sm">📅 {dateType} {formattedDate}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    
                                    {/* 🎯 NEW: Job Details Button - FIXED */}
                                    <div className="mt-3">
                                        <button
                                            onClick={() => loadJobDetails(job.job_id || job.id)}
                                            className="text-blue-300 hover:text-blue-200 text-sm font-medium flex items-center gap-1 transition-colors bg-blue-500/20 px-3 py-1 rounded"
                                        >
                                            {loadingDetails.has(job.job_id || job.id) ? (
                                                <>
                                                    <span className="animate-spin">⏳</span>
                                                    <span>Lädt Details...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{expandedJob === (job.job_id || job.id) ? '▼' : '▶'}</span>
                                                    <span>Details {expandedJob === (job.job_id || job.id) ? 'ausblenden' : 'anzeigen'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Ampel Score */}
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="flex flex-col items-center"
                                >
                                    {(() => {
                                      const ampelColor = job.ampel?.color || 'red';
                                      const score = Math.round(job.combined_score || combined);
                                      const label = job.ampel?.label || 'Fair';
                                      
                                      return (
                                        <div className="flex flex-col items-center space-y-1">
                                          <div className={`bg-gradient-to-r ${getAmpelColor(ampelColor)} text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg flex items-center space-x-1`}> 
                                            <span>{getAmpelIcon(ampelColor)}</span>
                                            <span>{score}%</span>
                                          </div>
                                          <span className="text-xs text-blue-200/60">{label}</span>
                                        </div>
                                      );
                                    })()}
                                </motion.div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    {/* Platform Badge */}
                                    <div className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                                        <span className="text-sm">{getPlatformIcon(job.platform)}</span>
                                        <span className="text-xs font-medium text-blue-200/90">{job.platform}</span>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {job.applied && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 rounded-full border border-green-400/30"
                                        >
                                            <span className="text-xs">✅</span>
                                            <span className="text-xs font-medium text-green-300">Beworben</span>
                                        </motion.div>
                                    )}
                                    
                                    {/* Hidden Badge */}
                                    {job.is_hidden && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center space-x-1 px-2 py-1 bg-gray-500/20 rounded-full border border-gray-400/30"
                                        >
                                            <span className="text-xs">👁️‍🗨️</span>
                                            <span className="text-xs font-medium text-gray-300">Ausgeblendet</span>
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Job Management Actions */}
                                <div className="flex items-center space-x-2">
                                    {!job.is_hidden ? (
                                        // Hide/Delete buttons for visible jobs
                                        <>
                                            {onHideJob && (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => onHideJob(job.id)}
                                                    className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 transition-all"
                                                    title="Job ausblenden"
                                                >
                                                    <span className="text-sm">👁️‍🗨️</span>
                                                </motion.button>
                                            )}
                                            {(onDeleteJob || onShowDeleteConfirmation) && (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        if (onShowDeleteConfirmation) {
                                                            onShowDeleteConfirmation(job.id, job.title);
                                                        } else if (onDeleteJob) {
                                                            onDeleteJob(job.id);
                                                        }
                                                    }}
                                                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 transition-all"
                                                    title="Job löschen"
                                                >
                                                    <span className="text-sm">🗑️</span>
                                                </motion.button>
                                            )}
                                        </>
                                    ) : (
                                        // Unhide button for hidden jobs
                                        onUnhideJob && (
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onUnhideJob(job.id)}
                                                className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 transition-all"
                                                title="Job wieder einblenden"
                                            >
                                                <span className="text-sm">👁️</span>
                                            </motion.button>
                                        )
                                    )}
                                </div>
                                
                                {/* Ampel Status Icon */}
                                <motion.div
                                    animate={{ 
                                        rotate: [0, 5, -5, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ 
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: index * 0.2
                                    }}
                                    className="text-2xl"
                                >
                                    {job.ampel?.score_tier === 'Premium' ? '💎' : 
                                     job.ampel?.score_tier === 'Excellent' ? '🏆' :
                                     job.ampel?.score_tier === 'Good' ? '⭐' :
                                     job.ampel?.score_tier === 'Fair' ? '📋' : '📄'}
                                </motion.div>
                            </div>

                            {/* 🎯 NEW: Job Details Dropdown */}
                            {expandedJob === (job.job_id || job.id) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                                >
                                    <div className="text-sm text-slate-300">
                                        <div className="font-medium text-blue-300 mb-2">📄 Stellendetails</div>
                                        {jobDetails[job.job_id || job.id] ? (
                                            <div className="space-y-2">
                                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                    {jobDetails[job.job_id || job.id].content}
                                                </div>
                                                {jobDetails[job.job_id || job.id].url && (
                                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                                        <a 
                                                            href={jobDetails[job.job_id || job.id].url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                                                        >
                                                            🔗 Zur Original-Stellenausschreibung
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 italic">Lädt Details...</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Hover Glow Effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300 pointer-events-none" />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default JobDisplay; 