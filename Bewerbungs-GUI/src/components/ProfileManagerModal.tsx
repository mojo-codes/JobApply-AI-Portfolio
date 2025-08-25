import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTemplateApi, SearchTemplate, SearchTemplateListItem } from '../services/searchTemplateApi';

interface SuchVorlagenManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onEditSuchVorlagen: (profile: SearchTemplate) => void;
  onApplySuchVorlagen: (profile: SearchTemplate) => void;
  onDeleteSuchVorlagen: (profileId: string) => Promise<void>;
  profiles: SearchTemplateListItem[];
  onRefreshSuchVorlagen: () => Promise<void>;
}

const SuchVorlagenManagerModal: React.FC<SuchVorlagenManagerModalProps> = ({
  visible,
  onClose,
  onCreateNew,
  onEditSuchVorlagen,
  onApplySuchVorlagen,
  onDeleteSuchVorlagen,
  profiles,
  onRefreshSuchVorlagen
}) => {
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [profileKeywords, setProfileKeywords] = useState<{ [key: string]: string[] }>({});
  const [profileDescriptions, setProfileDescriptions] = useState<{ [key: string]: string }>({});
  const [profileLocations, setProfileLocations] = useState<{ [key: string]: string }>({});

  // Load keywords, descriptions and locations for profiles when modal opens
  React.useEffect(() => {
    const loadProfileDetails = async () => {
      if (profiles.length === 0) return;
      
      const keywords: { [key: string]: string[] } = {};
      const descriptions: { [key: string]: string } = {};
      const locations: { [key: string]: string } = {};
      
      // Load details for each profile (but limit to avoid too many requests)
      for (const profile of profiles.slice(0, 10)) { // Limit to first 10 profiles
        try {
          const fullProfile = await searchTemplateApi.getProfile(profile.id);
          keywords[profile.id] = fullProfile.keywords.map(k => 
            typeof k === 'string' ? k : (k.term || k.keyword || '')
          ).filter(k => k.length > 0);
          descriptions[profile.id] = fullProfile.description || '';
          locations[profile.id] = Array.isArray(fullProfile.filters?.location) 
            ? fullProfile.filters.location.join(', ') 
            : (fullProfile.filters?.location || '');
        } catch (error) {
          console.error(`Failed to load details for profile ${profile.id}:`, error);
          keywords[profile.id] = [];
          descriptions[profile.id] = '';
          locations[profile.id] = '';
        }
      }
      
      setProfileKeywords(keywords);
      setProfileDescriptions(descriptions);
      setProfileLocations(locations);
    };
    
    loadProfileDetails();
  }, [profiles]);

  const handleApplySuchVorlagen = async (profileId: string) => {
    try {
      setLoading(true);
      const fullSuchVorlagen = await searchTemplateApi.getProfile(profileId);
      onApplySuchVorlagen(fullSuchVorlagen);
      onClose();
    } catch (error) {
      console.error('Failed to load profile for applying:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuchVorlagen = async (profileId: string) => {
    try {
      setLoading(true);
      const fullSuchVorlagen = await searchTemplateApi.getProfile(profileId);
      onEditSuchVorlagen(fullSuchVorlagen);
      // Don't close - keep modal open for layered navigation
    } catch (error) {
      console.error('Failed to load profile for editing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuchVorlagen = async (profileId: string) => {
    try {
      setLoading(true);
      await onDeleteSuchVorlagen(profileId);
      await onRefreshSuchVorlagen();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    onCreateNew();
    // Don't close - keep modal open for layered navigation
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 rounded-2xl shadow-xl w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">📝 Such-Vorlagen verwalten</h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors p-2"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Create New Such-Vorlagen Button */}
              <div className="mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateNew}
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➕ Neue Such-Vorlage erstellen
                </motion.button>
              </div>

              {/* Such-Vorlagens List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white/80 mb-4">Vorhandene Such-Vorlagen ({profiles.length})</h3>
                
                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <p>Noch keine Such-Vorlagen vorhanden.</p>
                    <p className="text-sm mt-2">Erstellen Sie Ihr erstes Such-Vorlage mit dem Button oben.</p>
                  </div>
                ) : (
                  profiles.map((profile, index) => (
                    <motion.div
                      key={`${profile.id}-${index}-${profile.name}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          {/* Title */}
                          <h4 className="text-white font-medium text-base">{profile.name}</h4>
                          
                          {/* Description (if available) */}
                          {profileDescriptions[profile.id] && (
                            <p className="text-white/70 text-sm mt-1 italic">
                              {profileDescriptions[profile.id]}
                            </p>
                          )}
                          
                          {/* Category */}
                          <p className="text-white/60 text-sm mt-1">
                            {profile.job_type && `Kategorie: ${profile.job_type}`}
                          </p>
                          
                          {/* Keywords Preview */}
                          <div className="mt-2">
                            <p className="text-white/40 text-xs">
                              Stichwörter: {' '}
                              {profileKeywords[profile.id] ? (
                                <span className="text-white/60">
                                  {profileKeywords[profile.id].length > 0 
                                    ? (() => {
                                        const keywords = profileKeywords[profile.id].join(', ');
                                        return keywords.length > 100 
                                          ? keywords.substring(0, 100) + '...'
                                          : keywords;
                                      })()
                                    : 'Keine Stichwörter'
                                  }
                                </span>
                              ) : (
                                <span className="text-white/40">Wird geladen...</span>
                              )}
                            </p>
                          </div>
                          
                          {/* Location Preview */}
                          <div className="mt-1">
                            <p className="text-white/40 text-xs">
                              Ort: {' '}
                              {profileLocations[profile.id] !== undefined ? (
                                <span className="text-white/60">
                                  {profileLocations[profile.id] 
                                    ? profileLocations[profile.id]
                                    : 'Kein Ort angegeben'
                                  }
                                </span>
                              ) : (
                                <span className="text-white/40">Wird geladen...</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-fit">
                          {/* Apply Button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApplySuchVorlagen(profile.id)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-300 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Such-Vorlage anwenden - Stichwörter in Schnellsuche laden"
                          >
                            🔄 Anwenden
                          </motion.button>

                          {/* Edit Button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditSuchVorlagen(profile.id)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-300 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Such-Vorlage bearbeiten"
                          >
                            ✏️ Bearbeiten
                          </motion.button>

                          {/* Delete Button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDeleteConfirm(profile.id)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-300 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Such-Vorlage löschen"
                          >
                            🗑️ Löschen
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {deleteConfirm && (
                <motion.div
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-gray-800 rounded-lg p-6 border border-white/20 max-w-md mx-4"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-4">Such-Vorlage löschen?</h3>
                    <p className="text-white/70 mb-6">
                      Sind Sie sicher, dass Sie das Such-Vorlage "{profiles.find(p => p.id === deleteConfirm)?.name}" löschen möchten? 
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleDeleteSuchVorlagen(deleteConfirm)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Löschen
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuchVorlagenManagerModal;