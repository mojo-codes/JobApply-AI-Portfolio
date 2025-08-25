import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import careerProfileApi, { CareerProfile } from '../services/careerProfileApi';
import CareerProfileEditor from './CareerProfileEditor';

interface CareerProfileManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileActivated?: (profile: CareerProfile | null) => void;
}

const CareerProfileManagerModal: React.FC<CareerProfileManagerModalProps> = ({
  visible,
  onClose,
  onProfileActivated
}) => {
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CareerProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Load profiles when modal opens
  useEffect(() => {
    if (visible) {
      loadProfiles();
      loadActiveProfile();
    }
  }, [visible]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      console.log('📋 Loading profiles...');
      const result = await careerProfileApi.listProfiles();
      console.log('📋 Load result:', result);
      
      if (result.success && result.data) {
        setProfiles(result.data);
        console.log('📋 Profiles set:', result.data.length, 'profiles');
      } else {
        console.error('❌ Failed to load profiles:', result.message);
        showToast_('Fehler beim Laden der Profile: ' + (result.message || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      showToast_('Netzwerkfehler beim Laden der Profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveProfile = async () => {
    try {
      const result = await careerProfileApi.getActiveProfile();
      console.log('🔍 loadActiveProfile result:', result);
      if (result.success && result.data) {
        setActiveProfile(result.data);
        console.log('✅ Active profile set:', result.data);
      } else {
        setActiveProfile(null);
        console.log('❌ No active profile found');
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setShowEditor(true);
  };

  const handleEditProfile = (profile: CareerProfile) => {
    setEditingProfile(profile);
    setShowEditor(true);
  };

  const handleSaveProfile = async (profile: CareerProfile) => {
    try {
      let result;
      
      if (editingProfile) {
        // Update existing profile
        result = await careerProfileApi.updateProfile(editingProfile.profile_name, profile);
      } else {
        // Create new profile
        result = await careerProfileApi.createProfile(profile);
      }

      if (result.success) {
        showToast_(
          editingProfile 
            ? 'Profil erfolgreich aktualisiert!' 
            : 'Profil erfolgreich erstellt!', 
          'success'
        );
        setShowEditor(false);
        setEditingProfile(null);
        await loadProfiles();
      } else {
        if (result.errors) {
          const errorMessages = Object.values(result.errors).flat().join(', ');
          showToast_('Validierungsfehler: ' + errorMessages, 'error');
        } else {
          showToast_('Fehler beim Speichern: ' + (result.message || 'Unbekannter Fehler'), 'error');
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast_('Netzwerkfehler beim Speichern', 'error');
    }
  };

  const handleDeleteProfile = async (profileName: string) => {
    try {
      console.log('🗑️ Deleting profile:', profileName);
      const result = await careerProfileApi.deleteProfile(profileName);
      console.log('🗑️ Delete result:', result);
      
      if (result.success) {
        showToast_('Profil erfolgreich gelöscht!', 'success');
        setDeleteConfirm(null);
        
        // Check if deleted profile was the active one BEFORE clearing local state
        const wasActiveProfile = activeProfile?.profile_name === profileName;
        
        // Force clear the profiles state immediately
        setProfiles(prev => prev.filter(p => p.profile_name !== profileName));
        
        // If deleted profile was active, clear active profile locally
        if (wasActiveProfile) {
          setActiveProfile(null);
          console.log('🔄 Deleted profile was active - clearing local active state');
        }
        
        // 🎯 CRITICAL: Check backend for active profile and notify parent
        // This ensures the main app synchronizes with the backend state
        try {
          console.log('🔄 Checking backend active profile after deletion...');
          const activeCheck = await careerProfileApi.getActiveProfile();
          
          if (onProfileActivated) {
            if (activeCheck.success && activeCheck.data) {
              // There's still an active profile - update parent
              console.log('✅ Backend still has active profile:', activeCheck.data.profile_name);
              onProfileActivated(activeCheck.data);
            } else {
              // No active profile - clear it in parent
              console.log('✅ No active profile in backend - clearing parent');
              onProfileActivated(null);
            }
          }
        } catch (error) {
          console.warn('Failed to check active profile after deletion:', error);
          // Fallback: if there was an active profile and we just deleted it, clear parent
          if (wasActiveProfile && onProfileActivated) {
            console.log('⚠️ Fallback: clearing active profile in parent');
            onProfileActivated(null);
          }
        }
        
        // Reload profiles from server
        console.log('🔄 Reloading profiles...');
        await loadProfiles();
      } else {
        showToast_('Fehler beim Löschen: ' + (result.message || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      showToast_('Netzwerkfehler beim Löschen', 'error');
    }
  };

  const handleSetActiveProfile = async (profileName: string) => {
    try {
      const result = await careerProfileApi.setActiveProfile(profileName);
      
      if (result.success) {
        showToast_('Profil als aktiv gesetzt!', 'success');
        await loadActiveProfile();
        await loadProfiles();
        
        // Call onProfileActivated callback with the activated profile
        if (onProfileActivated) {
          const profile = profiles.find(p => p.profile_name === profileName);
          if (profile) {
            onProfileActivated(profile);
          }
        }
      } else {
        showToast_('Fehler beim Aktivieren: ' + (result.message || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Failed to set active profile:', error);
      showToast_('Netzwerkfehler beim Aktivieren', 'error');
    }
  };

  const showToast_ = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCancelEditor = () => {
    setShowEditor(false);
    setEditingProfile(null);
  };

  if (!visible) return null;

  return (
    <>
      <AnimatePresence>
        {visible && !showEditor && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 rounded-2xl shadow-xl w-[90vw] max-w-5xl max-h-[80vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-semibold text-white">🎯 Career-Profile verwalten</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Erstelle und verwalte deine beruflichen Profile für verschiedene Karrierewege
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  title="Schließen"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-white">Lade Profile...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Create New Profile Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateNew}
                      className="w-full p-4 bg-gradient-to-r from-green-500/20 to-blue-600/20 hover:from-green-500/30 hover:to-blue-600/30 border border-green-400/30 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <span className="text-xl">➕</span>
                      <span>Neues Career-Profil erstellen</span>
                    </motion.button>

                    {/* Active Profile Info */}
                    {activeProfile && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-400/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">🎯</span>
                            <div>
                              <h3 className="text-white font-medium">Aktives Profil</h3>
                              <p className="text-blue-200">{activeProfile.profile_name}</p>
                              <p className="text-blue-300 text-sm">{activeProfile.description}</p>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={async () => {
                              try {
                                const response = await careerProfileApi.deactivateProfile();
                                if (response.success) {
                                  setActiveProfile(null);
                                  showToast_('Profil deaktiviert', 'success');
                                  // Notify parent component about deactivation
                                  if (onProfileActivated) {
                                    onProfileActivated(null);
                                  }
                                } else {
                                  showToast_(response.message || 'Fehler beim Deaktivieren', 'error');
                                }
                              } catch (error) {
                                showToast_('Fehler beim Deaktivieren des Profils', 'error');
                              }
                            }}
                            className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            title="Profil deaktivieren"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Profiles List */}
                    {profiles.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📝</div>
                        <p className="text-white text-lg mb-2">Noch keine Profile vorhanden</p>
                        <p className="text-gray-400">
                          Erstelle dein erstes Career-Profil, um loszulegen!
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {profiles.map((profile, index) => {
                          const isActive = activeProfile?.profile_name === profile.profile_name;
                          
                          return (
                            <motion.div
                              key={profile.profile_name}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`bg-white/5 border rounded-xl p-5 ${
                                isActive 
                                  ? 'border-blue-400/50 bg-blue-500/10' 
                                  : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                              } transition-all duration-300`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-white font-medium text-lg">
                                      {profile.profile_name}
                                    </h3>
                                    {isActive && (
                                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                        AKTIV
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="text-gray-300 text-sm mb-3">
                                    {profile.description}
                                  </p>

                                  {/* Skills */}
                                  {profile.skills && profile.skills.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-gray-400 text-xs mb-2">
                                        Fähigkeiten ({profile.skills.length}):
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {profile.skills.slice(0, 5).map((skill, skillIndex) => (
                                          <span
                                            key={skillIndex}
                                            className={`px-2 py-1 text-xs rounded-full ${
                                              skill.level === 'Experte' 
                                                ? 'bg-green-500/20 text-green-300' 
                                                : skill.level === 'Fortgeschritten'
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-blue-500/20 text-blue-300'
                                            }`}
                                          >
                                            {skill.name}
                                          </span>
                                        ))}
                                        {profile.skills.length > 5 && (
                                          <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded-full">
                                            +{profile.skills.length - 5} weitere
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}


                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col space-y-2 ml-4">
                                  {!isActive && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleSetActiveProfile(profile.profile_name)}
                                      className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-lg hover:bg-blue-500/30 transition-colors"
                                    >
                                      Aktivieren
                                    </motion.button>
                                  )}
                                  
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEditProfile(profile)}
                                    className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-lg hover:bg-green-500/30 transition-colors"
                                  >
                                    Bearbeiten
                                  </motion.button>
                                  
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🗑️ Delete button clicked for:', profile.profile_name);
                                      setDeleteConfirm(profile.profile_name);
                                      console.log('🗑️ Delete confirm state set to:', profile.profile_name);
                                    }}
                                    className="px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
                                  >
                                    Löschen
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 p-4 flex justify-between items-center">
                <div className="text-gray-400 text-sm">
                  {profiles.length > 0 ? `${profiles.length} Profile` : 'Keine Profile'}
                  {activeProfile && ` • Aktiv: ${activeProfile.profile_name}`}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {console.log('🔍 Render Check - deleteConfirm state:', deleteConfirm)}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            {console.log('✅ Delete Modal SHOULD be rendering for:', deleteConfirm)}
            <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 border border-red-400/30 rounded-xl p-6 max-w-md mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-white font-medium text-lg mb-2">Profil löschen?</h3>
                <p className="text-gray-300 text-sm mb-6">
                  Möchtest du das Profil "<strong>{deleteConfirm}</strong>" wirklich löschen? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(deleteConfirm)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Career Profile Editor */}
      <CareerProfileEditor
        visible={showEditor}
        profile={editingProfile}
        onSave={handleSaveProfile}
        onCancel={handleCancelEditor}
      />

      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-70 ${
            toastType === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-center">
            {toastType === 'success' ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{toastMessage}</span>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default CareerProfileManagerModal;