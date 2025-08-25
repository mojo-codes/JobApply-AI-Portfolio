import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchTemplate } from '../services/searchTemplateApi';
import TagInput from './TagInput';

interface ProfileWizardProps {
  visible: boolean;
  initialProfile?: SearchTemplate | null;
  onSave: (profile: SearchTemplate) => void;
  onCancel: () => void;
}

const steps = [
  'Grunddaten',
  'Stichwörter',
  'Filter',
  'Zusammenfassung'
] as const;

type Step = typeof steps[number];

// Generate a unique ID for new profiles
const generateProfileId = () => {
  return 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const ProfileWizard: React.FC<ProfileWizardProps> = ({ visible, initialProfile, onSave, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<Step>('Grunddaten');
  // Start with empty state - will be set by useEffect
  const [profile, setProfile] = useState<SearchTemplate>({
    id: '',
    name: '',
    job_type: 'General',
    description: '',
    keywords: [],
    filters: {},
    search_settings: {
      max_jobs: 15,
      auto_process: false,
      providers: { jsearch: true, adzuna: true, stepstone: false }
    }
  });

  // Extract keywords as simple strings for TagInput
  const getKeywordStrings = (keywords: any[]): string[] => {
    return keywords.map(k => typeof k === 'string' ? k : (k.term || k.keyword || '')).filter(Boolean);
  };

  const setKeywordsFromStrings = (keywordStrings: string[]) => {
    const keywords = keywordStrings.map(keyword => ({
      term: keyword,
      weight: 1.0,
      required: false,
      variations: []
    }));
    setProfile((prev: SearchTemplate) => ({ ...prev, keywords }));
  };

  // Update profile when wizard opens or initialProfile changes
  useEffect(() => {
    if (visible) {
      if (initialProfile) {
        // Editing existing profile - use the existing profile
        console.log('🔧 ProfileWizard: Editing existing profile', initialProfile.id);
        console.log('🔧 ProfileWizard: Initial profile data:', initialProfile);
        setProfile(initialProfile);
      } else {
        // Creating new profile - generate new ID
        const newId = generateProfileId();
        console.log('🆕 ProfileWizard: Creating new profile with ID:', newId);
        setProfile({
          id: newId,
          name: '',
          job_type: 'General',
          description: '',
          keywords: [],
          filters: {},
          search_settings: {
            max_jobs: 15,
            auto_process: false,
            providers: { jsearch: true, adzuna: true, stepstone: false }
          }
        });
      }
      // Reset wizard to first step when wizard opens
      setCurrentStep('Grunddaten');
    }
  }, [visible, initialProfile]);


  const stepIndex = steps.indexOf(currentStep);
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;

  // Validation for current step
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 'Grunddaten':
        return profile.name.trim().length > 0;
      case 'Stichwörter':
        return profile.keywords.length > 0 && profile.keywords.some((k: any) => {
          const keyword = typeof k === 'string' ? k : (k.keyword || k.term);
          return keyword.trim().length > 0;
        });
      default:
        return true;
    }
  };

  const next = () => {
    if (!isLast && isCurrentStepValid()) {
      setCurrentStep(steps[stepIndex + 1]);
    }
  };
  
  const back = () => {
    if (!isFirst) {
      setCurrentStep(steps[stepIndex - 1]);
    }
    // Note: First step back button is now hidden, only X button in header can close
  };

  const handleSave = () => {
    onSave(profile);
  };

  // Simple render functions for each step (placeholder UI)
  const renderStep = () => {
    switch (currentStep) {
      case 'Grunddaten':
        return (
          <div className="space-y-4">
            <label className="block text-sm text-blue-200">Such-Vorlagen-Name</label>
            <input
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none"
              placeholder="z. B. Marketing Remote"
            />
            <label className="block text-sm text-blue-200">Job-Kategorie</label>
            <select
              value={profile.job_type}
              onChange={e => setProfile({ ...profile, job_type: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none"
            >
              <option value="General">Allgemein</option>
              <option value="Software-Dev">Software-Entwicklung</option>
              <option value="Data-Science">Data Science</option>
              <option value="Digital-Marketing">Digital Marketing</option>
              <option value="Product-Management">Product Management</option>
              <option value="Design-UX">Design & UX</option>
              <option value="Sales-Business-Dev">Sales & Business Development</option>
              <option value="Operations">Operations</option>
              <option value="Consulting">Consulting</option>
              <option value="Finance">Finanzen</option>
              <option value="Human-Resources">Human Resources</option>
            </select>
            <label className="block text-sm text-blue-200">Beschreibung</label>
            <textarea
              value={profile.description}
              onChange={e => setProfile({ ...profile, description: e.target.value })}
              className="w-full h-24 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none"
              placeholder="Optionale Beschreibung der Such-Vorlage"
            />
          </div>
        );
      case 'Stichwörter':
        return (
          <div className="space-y-4">
            <label className="block text-sm text-blue-200">Stichwörter</label>
            <TagInput
              tags={getKeywordStrings(profile.keywords)}
              onChange={setKeywordsFromStrings}
              placeholder="IT-Support, Software-Entwicklung, Marketing, React, TypeScript..."
              className="w-full"
            />
            <div className="flex justify-between items-start">
              <p className="text-xs text-blue-300/70" id="tag-help-text">
                Geben Sie relevante Stichwörter ein. Trennen Sie mehrere Begriffe durch Kommas, Leerzeichen oder Enter. 
                Klicken Sie auf das × neben einem Tag zum Entfernen.
              </p>
              <span className="text-xs text-blue-300/50 ml-2">
                {profile.keywords.length}/20 Tags
              </span>
            </div>
          </div>
        );
      case 'Filter':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-blue-200 mb-2">📍 Orte (optional)</label>
              <input
                type="text"
                value={
                  typeof profile.filters.location === 'string' 
                    ? profile.filters.location 
                    : Array.isArray(profile.filters.location) 
                      ? profile.filters.location.join(', ') 
                      : ''
                }
                onChange={e => setProfile({
                  ...profile,
                  filters: { ...profile.filters, location: e.target.value }
                })}
                placeholder="z.B. Berlin, Hamburg, Remote"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-blue-200/60 text-xs mt-2">
                Mehrere Orte mit Komma trennen. "Remote" für Remote-Jobs.
              </p>
            </div>
            
            <div>
              <label className="block text-sm text-blue-200 mb-2">🎯 Maximale Anzahl Jobs</label>
              <input
                type="number"
                value={profile.search_settings.max_jobs}
                onChange={e => setProfile({
                  ...profile,
                  search_settings: { ...profile.search_settings, max_jobs: parseInt(e.target.value) }
                })}
                min="1"
                max="50"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        );
      case 'Zusammenfassung':
        return (
          <div className="space-y-2 text-blue-200">
            <p><strong>Name:</strong> {profile.name || '—'}</p>
            <p><strong>Job-Kategorie:</strong> {profile.job_type || '—'}</p>
            <p><strong>Beschreibung:</strong> {profile.description || '—'}</p>
            <p><strong>Stichwörter:</strong> {profile.keywords.map((k: any) => typeof k === 'string' ? k : k.term).join(', ') || '—'}</p>
            <p><strong>Orte:</strong> {
              typeof profile.filters.location === 'string' 
                ? profile.filters.location 
                : Array.isArray(profile.filters.location) 
                  ? profile.filters.location.join(', ') 
                  : '—'
            }</p>
            <p><strong>Maximale Jobs:</strong> {profile.search_settings.max_jobs}</p>
          </div>
        );
      default:
        return null;
    }
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
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 rounded-2xl shadow-xl w-[90vw] max-w-3xl p-6 flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Such-Vorlagen-Assistent – {currentStep}</h2>
              <button
                onClick={onCancel}
                className="text-white/60 hover:text-white transition-colors p-2"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto mb-6">
              {renderStep()}
              
              {/* Validation Messages */}
              {!isCurrentStepValid() && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-200 text-sm">
                    {currentStep === 'Grunddaten' && '⚠️ Bitte geben Sie einen Such-Vorlagen-Namen ein'}
                    {currentStep === 'Stichwörter' && '⚠️ Bitte geben Sie mindestens ein Stichwort ein'}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              {!isFirst ? (
                <button
                  onClick={back}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                >
                  ← Zurück
                </button>
              ) : (
                <div></div>
              )}
              {isLast ? (
                <button
                  onClick={handleSave}
                  className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-colors"
                >
                  ✅ Speichern
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={!isCurrentStepValid()}
                  className={`px-6 py-2 rounded-lg text-white shadow-lg transition-colors ${
                    isCurrentStepValid() 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  Weiter →
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileWizard; 