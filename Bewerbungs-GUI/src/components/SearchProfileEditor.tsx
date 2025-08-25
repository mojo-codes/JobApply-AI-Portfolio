import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddressAutocomplete from './AddressAutocomplete';

interface SearchKeyword {
  keyword: string;
  weight: number;
  required: boolean;
}

interface RankingWeights {
  title_keyword_match: number;
  description_keyword_match: number;
  location_preference: number;
  remote_work_bonus: number;
  salary_range_match: number;
  company_size_preference: number;
  recency_bonus: number;
  exclusion_penalty: number;
}

interface SearchProfile {
  id: string;
  name: string;
  job_type: string;
  description: string;
  keywords: SearchKeyword[];
  filters: {
    location?: string[];
    salary_min?: number;
    salary_max?: number;
    experience_level?: string;
    employment_type?: string[];
    remote_preference?: string;
    company_size?: string[];
    industries?: string[];
  };
  search_settings: {
    max_jobs: number;
    auto_process: boolean;
    providers: {
      jsearch: boolean;
      adzuna: boolean;
      stepstone: boolean;
    };
  };
  ranking_weights?: RankingWeights;
}

interface SearchProfileEditorProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (profile: SearchProfile) => void;
  currentProfile?: SearchProfile | null;
  availableProfiles: SearchProfile[];
  onLoadProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

const JOB_TYPES = [
  'Software-Dev',
  'Data-Science',
  'Digital-Marketing',
  'E-Commerce',
  'Sales',
  'Customer-Support',
  'Other'
];

const SearchProfileEditor: React.FC<SearchProfileEditorProps> = ({
  isVisible,
  onClose,
  onSave,
  currentProfile,
  availableProfiles,
  onLoadProfile,
  onDeleteProfile
}) => {
  const [profile, setProfile] = useState<SearchProfile>({
    id: '',
    name: '',
    job_type: 'Other',
    description: '',
    keywords: [],
    filters: {},
    search_settings: {
      max_jobs: 15,
      auto_process: false,
      providers: {
        jsearch: true,
        adzuna: true,
        stepstone: false
      }
    },
    ranking_weights: {
      title_keyword_match: 2.0,
      description_keyword_match: 1.0,
      location_preference: 1.5,
      remote_work_bonus: 1.2,
      salary_range_match: 0.8,
      company_size_preference: 0.5,
      recency_bonus: 0.3,
      exclusion_penalty: 3.0
    }
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newWeight, setNewWeight] = useState(1.0);
  const [isRequired, setIsRequired] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfile) {
      setProfile(currentProfile);
    } else {
      // Reset to default when no profile is loaded
      setProfile({
        id: `profile_${Date.now()}`,
        name: '',
        job_type: 'Other',
        description: '',
        keywords: [],
        filters: {},
        search_settings: {
          max_jobs: 15,
          auto_process: false,
          providers: {
            jsearch: true,
            adzuna: true,
            stepstone: false
          }
        },
        ranking_weights: {
          title_keyword_match: 2.0,
          description_keyword_match: 1.0,
          location_preference: 1.5,
          remote_work_bonus: 1.2,
          salary_range_match: 0.8,
          company_size_preference: 0.5,
          recency_bonus: 0.3,
          exclusion_penalty: 3.0
        }
      });
    }
  }, [currentProfile]);

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      const updatedKeywords = [...profile.keywords, {
        keyword: newKeyword.trim(),
        weight: newWeight,
        required: isRequired
      }];
      setProfile({ ...profile, keywords: updatedKeywords });
      setNewKeyword('');
      setNewWeight(1.0);
      setIsRequired(false);
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const updatedKeywords = profile.keywords.filter((_, i) => i !== index);
    setProfile({ ...profile, keywords: updatedKeywords });
  };

  const handleUpdateKeyword = (index: number, field: keyof SearchKeyword, value: any) => {
    const updatedKeywords = [...profile.keywords];
    updatedKeywords[index] = { ...updatedKeywords[index], [field]: value };
    setProfile({ ...profile, keywords: updatedKeywords });
  };

  const handleSave = () => {
    if (profile.name.trim() && profile.keywords.length > 0) {
      onSave(profile);
      onClose();
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    onDeleteProfile(profileId);
    setShowDeleteConfirm(null);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Search Profile Editor
              </h2>
              <p className="text-blue-200/70 text-sm">Erstelle und verwalte deine Such-Vorlagen</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile List */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">📚</span>
                <span>Verfügbare Such-Vorlagen</span>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableProfiles.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      profile.id === p.id
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div onClick={() => onLoadProfile(p.id)} className="flex-1">
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-blue-200/60">{p.job_type}</div>
                        <div className="text-xs text-blue-200/40">{p.keywords.length} Keywords</div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(p.id);
                        }}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300"
                      >
                        🗑️
                      </motion.button>
                    </div>
                    
                    {/* Delete Confirmation */}
                    <AnimatePresence>
                      {showDeleteConfirm === p.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-2 bg-red-500/20 rounded-lg"
                        >
                          <p className="text-sm text-white mb-2">Wirklich löschen?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteProfile(p.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                            >
                              Ja
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm"
                            >
                              Nein
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                
                {availableProfiles.length === 0 && (
                  <p className="text-blue-200/40 text-sm text-center py-4">
                    Keine Profile vorhanden
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">📝</span>
                <span>Such-Vorlagen-Informationen</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Such-Vorlagen-Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="z.B. Marketing Remote Jobs"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Job Typ</label>
                  <select
                    value={profile.job_type}
                    onChange={(e) => setProfile({ ...profile, job_type: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {JOB_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Beschreibung</label>
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    rows={2}
                    placeholder="Kurze Beschreibung der Such-Vorlage..."
                  />
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">🔍</span>
                <span>Keywords & Gewichtung</span>
              </h3>
              
              {/* Add Keyword Form */}
              <div className="mb-4 p-3 bg-white/5 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Neues Keyword..."
                  />
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(parseFloat(e.target.value) || 1.0)}
                    className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddKeyword}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white font-medium"
                  >
                    +
                  </motion.button>
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-white/70">Pflicht-Keyword</span>
                </label>
              </div>
              
              {/* Keywords List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {profile.keywords.map((kw, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                  >
                    <input
                      type="text"
                      value={kw.keyword}
                      onChange={(e) => handleUpdateKeyword(index, 'keyword', e.target.value)}
                      className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                    />
                    <input
                      type="number"
                      value={kw.weight}
                      onChange={(e) => handleUpdateKeyword(index, 'weight', parseFloat(e.target.value) || 1.0)}
                      className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={kw.required}
                        onChange={(e) => handleUpdateKeyword(index, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </label>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveKeyword(index)}
                      className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                    >
                      ✕
                    </motion.button>
                  </motion.div>
                ))}
                
                {profile.keywords.length === 0 && (
                  <p className="text-blue-200/40 text-sm text-center py-4">
                    Keine Keywords hinzugefügt
                  </p>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <span>Filter & Präferenzen</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Bevorzugter Standort</label>
                  <AddressAutocomplete
                    value={profile.filters.location?.[0] || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      filters: {
                        ...profile.filters,
                        location: value ? [value] : []
                      }
                    })}
                    placeholder="Stadt, PLZ oder Adresse eingeben..."
                    className="w-full"
                    isPrefilled={false}
                  />
                  <p className="text-xs text-white/50 mt-1">
                    Geben Sie Ihren bevorzugten Arbeitsort ein. Dies hilft bei der Jobsuche und -bewertung.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Min. Gehalt (€/Jahr)</label>
                    <input
                      type="number"
                      value={profile.filters.salary_min || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        filters: {
                          ...profile.filters,
                          salary_min: parseInt(e.target.value) || undefined
                        }
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="z.B. 50000"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Max. Gehalt (€/Jahr)</label>
                    <input
                      type="number"
                      value={profile.filters.salary_max || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        filters: {
                          ...profile.filters,
                          salary_max: parseInt(e.target.value) || undefined
                        }
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="z.B. 80000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Erfahrungslevel</label>
                  <select
                    value={profile.filters.experience_level || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      filters: {
                        ...profile.filters,
                        experience_level: e.target.value || undefined
                      }
                    })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Alle Erfahrungslevel</option>
                    <option value="entry">Einstieg / Junior</option>
                    <option value="mid">Mittel / Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead / Teamleitung</option>
                    <option value="executive">Führungsposition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Remote-Work Präferenz</label>
                  <select
                    value={profile.filters.remote_preference || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      filters: {
                        ...profile.filters,
                        remote_preference: e.target.value || undefined
                      }
                    })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Keine Präferenz</option>
                    <option value="remote_only">Nur Remote</option>
                    <option value="hybrid_preferred">Hybrid bevorzugt</option>
                    <option value="onsite_preferred">Vor Ort bevorzugt</option>
                    <option value="onsite_only">Nur vor Ort</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Settings */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">⚙️</span>
                <span>Such-Einstellungen</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Max. Anzahl Jobs</label>
                  <input
                    type="number"
                    value={profile.search_settings.max_jobs}
                    onChange={(e) => setProfile({
                      ...profile,
                      search_settings: {
                        ...profile.search_settings,
                        max_jobs: parseInt(e.target.value) || 15
                      }
                    })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="1"
                    max="50"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Job-Provider</label>
                  <div className="space-y-2">
                    {Object.entries(profile.search_settings.providers).map(([provider, enabled]) => (
                      <label key={provider} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setProfile({
                            ...profile,
                            search_settings: {
                              ...profile.search_settings,
                              providers: {
                                ...profile.search_settings.providers,
                                [provider]: e.target.checked
                              }
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-white/80 capitalize">{provider}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking Weights */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                <span className="text-lg">⚖️</span>
                <span>Ranking-Gewichtungen</span>
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title Keyword Match */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Titel-Keywords (aktuell: {profile.ranking_weights?.title_keyword_match || 2.0})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.title_keyword_match || 2.0}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          title_keyword_match: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Description Keyword Match */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Beschreibungs-Keywords (aktuell: {profile.ranking_weights?.description_keyword_match || 1.0})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.description_keyword_match || 1.0}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          description_keyword_match: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Location Preference */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Standort-Präferenz (aktuell: {profile.ranking_weights?.location_preference || 1.5})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.location_preference || 1.5}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          location_preference: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Remote Work Bonus */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Remote-Work Bonus (aktuell: {profile.ranking_weights?.remote_work_bonus || 1.2})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.remote_work_bonus || 1.2}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          remote_work_bonus: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Salary Range Match */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Gehalts-Match (aktuell: {profile.ranking_weights?.salary_range_match || 0.8})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.salary_range_match || 0.8}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          salary_range_match: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Company Size Preference */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Unternehmensgröße (aktuell: {profile.ranking_weights?.company_size_preference || 0.5})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.company_size_preference || 0.5}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          company_size_preference: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Recency Bonus */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Aktualitäts-Bonus (aktuell: {profile.ranking_weights?.recency_bonus || 0.3})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profile.ranking_weights?.recency_bonus || 0.3}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          recency_bonus: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Exclusion Penalty */}
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Ausschluss-Strafe (aktuell: {profile.ranking_weights?.exclusion_penalty || 3.0})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={profile.ranking_weights?.exclusion_penalty || 3.0}
                      onChange={(e) => setProfile({
                        ...profile,
                        ranking_weights: {
                          ...profile.ranking_weights!,
                          exclusion_penalty: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setProfile({
                      ...profile,
                      ranking_weights: {
                        title_keyword_match: 3.0,
                        description_keyword_match: 2.0,
                        location_preference: 1.0,
                        remote_work_bonus: 2.5,
                        salary_range_match: 1.5,
                        company_size_preference: 0.3,
                        recency_bonus: 0.8,
                        exclusion_penalty: 4.0
                      }
                    })}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg text-white text-sm"
                  >
                    🎯 Keyword-fokussiert
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setProfile({
                      ...profile,
                      ranking_weights: {
                        title_keyword_match: 1.5,
                        description_keyword_match: 1.0,
                        location_preference: 2.5,
                        remote_work_bonus: 3.0,
                        salary_range_match: 0.5,
                        company_size_preference: 1.0,
                        recency_bonus: 0.5,
                        exclusion_penalty: 2.0
                      }
                    })}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded-lg text-white text-sm"
                  >
                    🏠 Remote-orientiert
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setProfile({
                      ...profile,
                      ranking_weights: {
                        title_keyword_match: 2.0,
                        description_keyword_match: 1.0,
                        location_preference: 1.5,
                        remote_work_bonus: 1.2,
                        salary_range_match: 0.8,
                        company_size_preference: 0.5,
                        recency_bonus: 0.3,
                        exclusion_penalty: 3.0
                      }
                    })}
                    className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/50 rounded-lg text-white text-sm"
                  >
                    🔄 Standard zurücksetzen
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
            disabled={!profile.name.trim() || profile.keywords.length === 0}
            className={`flex-1 px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-all duration-300 ${
              profile.name.trim() && profile.keywords.length > 0
                ? 'bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-400/90 hover:to-purple-500/90 border border-blue-400/50'
                : 'bg-gray-500/50 cursor-not-allowed opacity-50'
            }`}
          >
            ✅ Speichern
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SearchProfileEditor; 