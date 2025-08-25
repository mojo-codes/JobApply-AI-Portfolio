import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { JobSearchConfig, JOB_STORAGE_OPTIONS } from '../hooks/useJobAgent';
import PersonalDataSettings from './PersonalDataSettings';

/*interface JobSearchConfig {
  job_title: string;
  location: string;
  remote: boolean;
  max_jobs: number;
  auto_process: boolean;
  skip_stepstone?: boolean;
  manual_url?: string;
}*/

interface ConfigPanelProps {
  config: JobSearchConfig;
  setConfig: React.Dispatch<React.SetStateAction<JobSearchConfig>>;
  onClose: () => void;
  showCareerProfileManager: boolean;
  setShowCareerProfileManager: (show: boolean) => void;
  // Job Storage Settings
  getStorageRetentionDays: () => number;
  setStorageRetentionDays: (days: number) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  config, 
  setConfig, 
  onClose, 
  setShowCareerProfileManager,
  getStorageRetentionDays,
  setStorageRetentionDays
}) => {
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [cacheStats, setCacheStats] = React.useState<{count: number, size_bytes: number, last_modified: string | null}>({
    count: 0,
    size_bytes: 0,
    last_modified: null
  });
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [showPersonalDataSettings, setShowPersonalDataSettings] = useState(false);
  // const [mlWeight, setMlWeight] = React.useState<number>(40);

  // Load cache stats on mount
  React.useEffect(() => {
    fetchCacheStats();
  }, []);

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/jobs/cache/stats');
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  };

  const handleResetCache = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('http://localhost:5002/api/jobs/cache/reset', {
        method: 'POST'
      });
      if (response.ok) {
        showValidationToast('✅ Job-Cache erfolgreich zurückgesetzt!');
        setCacheStats({ count: 0, size_bytes: 0, last_modified: null });
      } else {
        showValidationToast('❌ Fehler beim Zurücksetzen des Caches');
      }
    } catch (error) {
      showValidationToast('❌ API-Verbindung fehlgeschlagen');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showValidationToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = () => {
    // Validate max_jobs before saving
    const maxJobs = Number(config.max_jobs);
    if (config.max_jobs !== '' && (maxJobs < 1 || maxJobs > 50)) {
      showValidationToast('⚠️ Maximale Anzahl Jobs muss zwischen 1 und 50 liegen!');
      return;
    }

    // Validate job_age_days
    const jobAgeDays = Number(config.job_age_days);
    if (config.job_age_days && (jobAgeDays < 1 || jobAgeDays > 90)) {
      showValidationToast('⚠️ Job-Alter muss zwischen 1 und 90 Tagen liegen!');
      return;
    }

    localStorage.setItem('jobSearchConfig', JSON.stringify(config));
    console.log("Saving config:", config);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;

    // Special validation for max_jobs
    if (name === 'max_jobs') {
      const numValue = Number(value);
      if (value !== '' && (numValue < 1 || numValue > 50)) {
        showValidationToast('⚠️ Maximale Anzahl Jobs muss zwischen 1 und 50 liegen!');
        // Show a brief visual feedback for invalid range
        target.style.borderColor = '#ef4444'; // Red border
        setTimeout(() => {
          target.style.borderColor = ''; // Reset border
        }, 2000);
        return; // Don't update state with invalid value
      }
    }

    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: target.type === 'number'
        ? (value === '' ? '' : Number(value))
        : value
    }));
  };

  const handleProviderChange = (provider: string, enabled: boolean) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      providers: {
        ...prevConfig.providers,
        [provider]: enabled
      }
    }));
  };

  // Removed unused variables for cleaner code

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 right-4 z-[60] backdrop-blur-md bg-red-500/90 border border-red-400/50 rounded-xl px-4 py-3 text-white font-medium shadow-lg"
        >
          {toastMessage}
        </motion.div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 flex items-center justify-center z-[70]"
        >
          <div className="backdrop-blur-xl bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-sm mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Job-Cache zurücksetzen?</h3>
            <p className="text-gray-300 mb-6">
              Alle {cacheStats.count} gespeicherten Jobs werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                disabled={isResetting}
              >
                Abbrechen
              </button>
              <button
                onClick={handleResetCache}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center justify-center"
                disabled={isResetting}
              >
                {isResetting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  '🗑️ Zurücksetzen'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Einstellungen
              </h2>
              <p className="text-blue-200/70 text-sm">Konfiguriere deine Jobsuche</p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 backdrop-blur-md bg-white/10 hover:bg-red-500/20 border border-white/30 hover:border-red-400/50 rounded-xl flex items-center justify-center transition-all duration-300"
          >
            <span className="text-lg">✕</span>
          </motion.button>
        </div>

        {/* Form */}
        <div className="space-y-6">


          {/* Job Age Filter */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <label className="block text-white font-medium mb-3 flex items-center space-x-2">
              <span className="text-lg">📅</span>
              <span>Job-Alter Filter</span>
            </label>
            <div className="space-y-3">
              <input
                type="range"
                name="job_age_days"
                value={config.job_age_days || 30}
                onChange={handleChange}
                min="1"
                max="90"
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-blue-200/60 text-sm">
                <span>1 Tag</span>
                <span className="text-white font-medium">{config.job_age_days || 30} Tage</span>
                <span>90 Tage</span>
              </div>
            </div>
            <p className="text-blue-200/60 text-xs mt-2">
              Nur Jobs anzeigen, die innerhalb der letzten {config.job_age_days || 30} Tage veröffentlicht wurden
            </p>
          </motion.div>

          {/* Job Cache Management */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <label className="block text-white font-medium mb-3 flex items-center space-x-2">
              <span className="text-lg">💾</span>
              <span>Job-Cache Verwaltung</span>
            </label>
            
            <div className="space-y-4">
              {/* Cache Stats */}
              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200/70">Gespeicherte Jobs:</span>
                  <span className="text-white font-medium">{cacheStats.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200/70">Cache-Größe:</span>
                  <span className="text-white font-medium">{formatBytes(cacheStats.size_bytes)}</span>
                </div>
                {cacheStats.last_modified && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200/70">Letzte Änderung:</span>
                    <span className="text-white font-medium">
                      {new Date(cacheStats.last_modified).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                )}
              </div>

              {/* Reset Button */}
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span>🗑️</span>
                <span>Job-Cache zurücksetzen</span>
              </button>
            </div>
          </motion.div>

          {/* Job Storage Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <label className="block text-white font-medium mb-3 flex items-center space-x-2">
              <span className="text-lg">⏰</span>
              <span>Job-Speicherdauer</span>
            </label>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <select
                  value={getStorageRetentionDays()}
                  onChange={(e) => setStorageRetentionDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                >
                  {JOB_STORAGE_OPTIONS.map((option) => (
                    <option key={option.days} value={option.days} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-blue-200/60 text-xs">
                  {getStorageRetentionDays() === -1 
                    ? 'Gefundene Jobs werden unbegrenzt gespeichert' 
                    : `Gefundene Jobs werden automatisch nach ${getStorageRetentionDays()} ${getStorageRetentionDays() === 1 ? 'Tag' : 'Tagen'} gelöscht`
                  }
                </p>
              </div>

              {/* Current Setting Display */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200/70">Aktuelle Einstellung:</span>
                  <span className="text-white font-medium">
                    {JOB_STORAGE_OPTIONS.find(opt => opt.days === getStorageRetentionDays())?.label || 'Unbekannt'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Job Providers - Functional Implementation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <label className="block text-white font-medium mb-3 flex items-center space-x-2">
              <span className="text-lg">🌐</span>
              <span>Job-Provider</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.providers?.jsearch !== false}
                    onChange={(e) => handleProviderChange('jsearch', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-3 text-sm text-white">JSearch API</span>
                </div>
                <span className="text-xs text-green-400">✓ Empfohlen</span>
              </label>
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.providers?.adzuna !== false}
                    onChange={(e) => handleProviderChange('adzuna', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-3 text-sm text-white">Adzuna API</span>
                </div>
                <span className="text-xs text-green-400">✓ Empfohlen</span>
              </label>
            </div>
            <p className="text-blue-200/60 text-xs mt-3">
              Standardmäßig sind beide Provider aktiviert für maximale Jobabdeckung. Deaktiviere Provider um die Suche zu begrenzen.
            </p>
          </motion.div>
          {/* Personal Data Settings Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">👤</span>
                <div>
                  <h3 className="text-white font-medium">Persönliche Daten</h3>
                  <p className="text-blue-200/60 text-sm">Name, Adresse, Kontaktdaten für PDF-Bewerbungen</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPersonalDataSettings(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-500/80 to-blue-600/80 hover:from-green-400/90 hover:to-blue-500/90 border border-green-400/50 rounded-xl text-white font-medium shadow-lg transition-all duration-300"
              >
                Bearbeiten
              </motion.button>
            </div>
          </motion.div>

          {/* Career Profile Management Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🎯</span>
                <div>
                  <h3 className="text-white font-medium">Career-Profile</h3>
                  <p className="text-blue-200/60 text-sm">Verwalte deine beruflichen Profile und Fähigkeiten</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCareerProfileManager(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500/80 to-pink-600/80 hover:from-purple-400/90 hover:to-pink-500/90 border border-purple-400/50 rounded-xl text-white font-medium shadow-lg transition-all duration-300"
              >
                Verwalten
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex space-x-4 mt-8 pt-6 border-t border-white/10"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-1 px-6 py-3 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white font-medium transition-all duration-300"
          >
            Abbrechen
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-400/90 hover:to-purple-500/90 border border-blue-400/50 rounded-xl text-white font-bold shadow-lg transition-all duration-300"
          >
            ✅ Speichern
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Personal Data Settings Modal */}
      <PersonalDataSettings 
        visible={showPersonalDataSettings}
        onClose={() => setShowPersonalDataSettings(false)}
      />

    </motion.div>
  );
};

export default ConfigPanel;
