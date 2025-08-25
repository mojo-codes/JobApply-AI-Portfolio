import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JobForSelection {
  id: string | number;
  title: string;
  company: string;
  location: string;
  platform: string;
  url: string;
  relevance_score: number;
  description?: string;
  salary_info?: string;
  date_posted?: string;
  first_seen?: string;
  is_new_since_last_search?: boolean;
}

interface JobSelectionProps {
  jobs: JobForSelection[];
  onJobsSelected: (selectedIndices: (string | number)[]) => void;
  onCancel: () => void;
  isVisible: boolean;
  // mlWeight: number; // commented out as unused
}

export const JobSelection: React.FC<JobSelectionProps> = ({
  jobs,
  onJobsSelected,
  onCancel,
  isVisible,
  // mlWeight // commented out as unused
}) => {
  const [selectedJobs, setSelectedJobs] = useState<Set<string | number>>(new Set());

  const toggleJobSelection = (jobId: string | number) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleSubmit = () => {
    onJobsSelected(Array.from(selectedJobs));
  };

  const getScoreColor = (score: number) => {
    if (score >= 40) return 'text-green-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 40) return 'bg-green-500/20 border-green-500/30';
    if (score >= 25) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
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

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-2">
              🎯 Job-Auswahl
            </h2>
            <p className="text-white/70">
              Wähle die Jobs aus, für die Bewerbungen erstellt werden sollen ({jobs.length} gefunden)
            </p>
          </div>

          {/* Job List */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-4">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
                    ${selectedJobs.has(job.id)
                      ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }
                  `}
                  onClick={() => toggleJobSelection(job.id)}
                >
                  {/* Checkbox */}
                  <div className="absolute top-4 right-4">
                    <div className={`
                      w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                      ${selectedJobs.has(job.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-white/30 hover:border-white/50'
                      }
                    `}>
                      {selectedJobs.has(job.id) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Job Info */}
                  <div className="pr-12">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="text-lg font-semibold text-white line-clamp-2">
                          {job.title}
                        </h3>
                        {job.is_new_since_last_search && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-400 text-white text-xs font-bold rounded-full shadow-lg"
                          >
                            ✨ NEU
                          </motion.div>
                        )}
                      </div>
                      <div className={`
                        px-2 py-1 rounded-lg border text-sm font-medium ml-4
                        ${getScoreBg(job.relevance_score)}
                      `}>
                        <span className={getScoreColor(job.relevance_score)}>
                          {job.relevance_score}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-white/70 mb-3">
                      <span className="flex items-center gap-1">
                        🏢 {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        📍 {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        🔗 {job.platform}
                      </span>
                      {job.date_posted && formatDate(job.date_posted) && (
                        <span className="flex items-center gap-1 text-blue-300">
                          📅 {formatDate(job.date_posted)}
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-white/60 text-sm line-clamp-2 mb-2">
                        {job.description}
                      </p>
                    )}

                    {job.salary_info && job.salary_info !== 'Nicht angegeben' && (
                      <div className="text-green-400 text-sm font-medium">
                        💰 {job.salary_info}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex items-center justify-between">
            <div className="text-white/70">
              {selectedJobs.size} von {jobs.length} Jobs ausgewählt
            </div>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                Abbrechen
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={selectedJobs.size === 0}
                className={`
                  px-6 py-2 rounded-xl font-medium transition-all
                  ${selectedJobs.size > 0
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                  }
                `}
              >
                {selectedJobs.size > 0 
                  ? `${selectedJobs.size} Jobs verarbeiten`
                  : 'Jobs auswählen'
                }
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 