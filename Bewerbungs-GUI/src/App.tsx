//
// This file is intentionally left blank to reset its state.
//

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import GlobalProgressBar from "./components/GlobalProgressBar";
// import StatusBar from "./components/StatusBar";
import JobDisplay from "./components/JobDisplay";
import DraftManager from "./components/NewDraftManager";
import ConfigPanel from "./components/ConfigPanel";
import { JobSelection } from "./components/JobSelection";
import { ApplicationApproval } from "./components/ApplicationApproval";
import { GenerationOverlay } from "./components/GenerationOverlay";
import ProfileWizard from "./components/ProfileWizard";
import SuchVorlagenManagerModal from "./components/ProfileManagerModal";
import CareerProfileManagerModal from "./components/CareerProfileManagerModal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
// import SchedulerPanel from "./components/SchedulerPanel";
// import ProcessControlPanel from "./components/ProcessControlPanel";
import { useJobAgent } from "./hooks/useJobAgent";
import { searchTemplateApi, SearchTemplate, SearchTemplateListItem } from "./services/searchTemplateApi";
import careerProfileApi, { CareerProfile } from "./services/careerProfileApi";
import LogModal from "./components/LogModal";
import TabModal from "./components/TabModal";
import ManualJobModal from "./components/ManualJobModal";
import ConfirmationDialog from "./components/ConfirmationDialog";
import { useToast } from "./components/ToastProvider";

function App() {
  const { addToast } = useToast();

  // ===== AGENT INTEGRATION =====
  const {
    isRunning,
    progress,
    currentStage,
    statusMessage,
    jobs,
    logs,
    error,
    startJobSearch,
    stopJobSearch,
    canStart,
    canStop,
    config,
    setConfig,
    showJobSelection,
    showApplicationApproval,
    rankedJobs,
    generatedApplications,
    submitJobSelection,
    submitApplicationApproval,
    cancelInteractiveFlow,
    resetSearchConfig,
    generationInfo,
    setGeneratedApplications,
    setShowApplicationApproval,
    // Job Management Functions
    hideJob,
    deleteJob,
    unhideJob,
    showHiddenJobs,
    setShowHiddenJobs,
    getApplicationStatus,
    applicationStatusMap,
    setApplicationStatusMap,
    clearPersistedJobs,
    removeDuplicateJobs,
    getStorageRetentionDays,
    setStorageRetentionDays,
    // 🎯 Confirmation Dialog Functions
    confirmationDialog,
    showDeleteConfirmation,
    confirmAction,
    cancelAction
  } = useJobAgent();

  // const [activeTab, setActiveTab] = useState<"jobs" | "logs" | "drafts" | "analytics" | "scheduler" | "control">("jobs");
  const [showConfig, setShowConfig] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);
  
  // Modal states for all tabs
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [showCareerProfileManager, setShowCareerProfileManager] = useState(false);
  
  const [showManualJobModal, setShowManualJobModal] = useState(false);
  const [isProcessingManualJob, setIsProcessingManualJob] = useState(false);
  const [searchProfiles, setSearchTemplates] = useState<SearchTemplateListItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<SearchTemplate | null>(null);
  const [activeCareerProfile, setActiveCareerProfile] = useState<CareerProfile | null>(null);

  // ===== AGE FILTER STATE =====
  const [ageFilterEnabled, setAgeFilterEnabled] = useState(false);
  const [ageFilterMaxDays, setAgeFilterMaxDays] = useState(7); // Default: last 7 days
  
  const ageFilterOptions = [
    { label: '1 Tag', days: 1 },
    { label: '3 Tage', days: 3 },
    { label: '1 Woche', days: 7 },
    { label: '2 Wochen', days: 14 },
    { label: '1 Monat', days: 30 },
    { label: '3 Monate', days: 90 }
  ];

  // Initialize from localStorage - REMOVED AUTO-OPENING
  useEffect(() => {
    // Previously auto-opened LogModal based on localStorage
    // This caused the System-Logs modal to open automatically on app start
    // Now removed to ensure clean app startup with main UI visible
    // System logs should only open when user explicitly clicks the logs tab
  }, []);

  // Load profiles on component mount
  useEffect(() => {
    loadProfiles();
    loadActiveCareerProfile();
  }, []);

  const loadProfiles = async () => {
    try {
      console.log('🔄 Loading all profiles (including archived)...');
      const profiles = await searchTemplateApi.listProfiles(true, true); // include archived + templates
      
      // Remove duplicates by ID to prevent React key warnings
      const uniqueProfiles = profiles.filter((profile, index, self) => 
        self.findIndex(p => p.id === profile.id) === index
      );
      
      console.log(`✅ Loaded ${profiles.length} profiles total (${profiles.length - uniqueProfiles.length} duplicates removed)`);
      setSearchTemplates(uniqueProfiles);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      // Silently fail - API might not be running
    }
  };

  const loadActiveCareerProfile = async () => {
    try {
      const response = await careerProfileApi.getActiveProfile();
      if (response.success && response.data) {
        setActiveCareerProfile(response.data);
      }
    } catch (error) {
      console.error("Failed to load active career profile:", error);
      // Silently fail - API might not be running or no active profile
    }
  };

  const deactivateCareerProfile = async () => {
    try {
      if (activeCareerProfile) {
        const response = await careerProfileApi.deactivateProfile();
        if (response.success) {
          setActiveCareerProfile(null);
          addToast("success", "Career-Profil deaktiviert");
        } else {
          addToast("error", response.message || "Fehler beim Deaktivieren des Career-Profils");
        }
      }
    } catch (error) {
      console.error("Failed to deactivate career profile:", error);
      addToast("error", "Fehler beim Deaktivieren des Career-Profils");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      console.log('🗑️ Deleting profile:', profileId);
      
      // Check if profile exists in current list to prevent 404s
      const profileExists = searchProfiles.find(p => p.id === profileId);
      if (!profileExists) {
        console.warn('⚠️ Profile not found in current list, skipping delete');
        addToast("error", "Such-Vorlage nicht gefunden oder bereits gelöscht");
        return;
      }
      
      await searchTemplateApi.deleteProfile(profileId);
      
      // Clear current profile if it was the deleted one
      if (currentProfile?.id === profileId) {
        setCurrentProfile(null);
      }
      
      // Reload profiles to update the list  
      await loadProfiles();
      console.log('✅ Profile deleted and list refreshed');
      
      // Force re-render by updating profiles state with duplicate removal
      setSearchTemplates(prev => {
        const filtered = prev.filter(p => p.id !== profileId);
        const uniqueProfiles = filtered.filter((profile, index, self) => 
          self.findIndex(p => p.id === profile.id) === index
        );
        return uniqueProfiles;
      });
      
      addToast("success", "Such-Vorlage erfolgreich gelöscht");
    } catch (error) {
      console.error("❌ Failed to delete profile:", error);
      addToast("error", "Fehler beim Löschen der Such-Vorlage");
      throw error;
    }
  };

  const handleStartJob = async () => {
    const success = await startJobSearch();
    if (success) {
      // setActiveTab("logs");
      addToast("success", "Jobsuche gestartet");
    } else {
      addToast("error", "Jobsuche konnte nicht gestartet werden");
    }
  };

  const handleApplicationApproval = async (payload: { job_id: number; application_text?: string | null; company_address?: string | null; force_pdf?: boolean }[]) => {
    await submitApplicationApproval(payload);
  };

  const handleCancelFlow = () => {
    cancelInteractiveFlow();
  };

  // Reset function to clear search configuration and return to initial state
  const handleReset = () => {
    console.log('🔄 Reset button clicked - clearing search configuration only');
    
    // Use the selective reset function that preserves logs and data
    resetSearchConfig();
    
    // Show success message
    addToast("success", "Suchkonfiguration zurückgesetzt - Logs und Daten bleiben erhalten");
    
    console.log('✅ Search configuration reset completed successfully');
  };

  // Ersetze die komplexe Profile-Save-Logik mit einfacherer, zuverlässigerer Logik
  const handleSaveProfile = async (profile: SearchTemplate) => {
    try {
      addToast('info', 'Speichere Such-Vorlage...');
      
      const transformedProfile = {
        ...profile,
        keywords: profile.keywords.map(k => ({
          term: typeof k === 'string' ? k : (k.term || k.keyword || ''),
          weight: typeof k === 'object' ? (k.weight || 1.0) : 1.0,
          required: typeof k === 'object' ? (k.required || false) : false,
          variations: typeof k === 'object' ? (k.variations || []) : []
        }))
      };

      // 🔧 SIMPLIFIED LOGIC: Use profile ID to determine if it's an update or create
      const isTemporaryId = profile.id.startsWith('profile_');
      const existingProfile = searchProfiles.find(p => p.id === profile.id);
      
      // Clear, simple decision logic:
      const isNewProfile = isTemporaryId && !existingProfile;
      
      console.log('🔍 Profile save analysis (SIMPLIFIED):', { 
        profileId: profile.id,
        isTemporaryId,
        existingProfile: !!existingProfile,
        isNewProfile,
        decision: isNewProfile ? 'CREATE' : 'UPDATE'
      });
      
      let savedProfile;
      if (isNewProfile) {
        // Create new profile - backend will assign a proper ID
        console.log('🆕 Creating new profile...');
        savedProfile = await searchTemplateApi.createProfile(transformedProfile, false);
        console.log('✅ New profile created with ID:', savedProfile.id);
      } else {
        // Update existing profile
        console.log('📝 Updating existing profile:', profile.id);
        try {
          savedProfile = await searchTemplateApi.updateProfile(profile.id, transformedProfile);
          console.log('✅ Profile updated successfully');
        } catch (updateError) {
          console.warn('⚠️ Update failed, trying create with overwrite:', updateError);
          savedProfile = await searchTemplateApi.createProfile(transformedProfile, true);
          console.log('✅ Profile overwritten successfully');
        }
      }
      
      // Reload profiles to ensure fresh state
      await loadProfiles();
      console.log('🔄 Profile list reloaded after save');

      addToast('Such-Vorlage erfolgreich gespeichert!', 'success');
      setCurrentProfile(savedProfile);
      
      // Apply profile settings immediately
      setConfig({
        location: Array.isArray(savedProfile.filters?.location) 
          ? savedProfile.filters.location.join(', ') 
          : (savedProfile.filters?.location || ''),
        keywords: savedProfile.keywords.map(k => 
          typeof k === 'string' ? k : (k.term || k.keyword || '')
        ).join(', '),
        maxJobs: savedProfile.search_settings?.max_jobs || 15,
        useJsearch: savedProfile.search_settings?.providers?.jsearch ?? true,
        useAdzuna: savedProfile.search_settings?.providers?.adzuna ?? true,
        useStepstone: savedProfile.search_settings?.providers?.stepstone ?? false
      });
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      addToast('Fehler beim Speichern der Such-Vorlage', 'error');
    }
  };



  // ===== Primary Action (Start Search or Open Configuration) =====
  const handlePrimaryAction = () => {
    // Remove temporary alert after testing
    // alert('BUTTON CLICKED! Debug Info: canStart=' + canStart + ', search_terms=' + config.search_terms);
    
    const hasSearchTerms = (config.search_terms || config.job_title || '').trim().length >= 2;
    const hasLocationOrRemote = config.remote || (config.location && config.location.trim().length > 0);
    
    console.log('🔍 Button clicked! Debug info:', {
      canStart,
      isRunning,
      hasSearchTerms,
      hasLocationOrRemote,
      search_terms: config.search_terms,
      search_terms_length: config.search_terms?.length || 0,
      job_title: config.job_title,
      job_title_length: config.job_title?.length || 0,
      combined_length: (config.search_terms || config.job_title || '').trim().length,
      location: config.location,
      remote: config.remote,
      full_config: config,
      currentProfile: currentProfile?.name || 'none'
    });
    
    // Additional debug: Check if this is from a profile vs manual input
    if (currentProfile) {
      console.log('🔧 Profile is loaded:', {
        profile_name: currentProfile.name,
        profile_keywords: currentProfile.keywords,
        config_search_terms: config.search_terms,
        keywords_match: currentProfile.keywords.map(k => typeof k === 'string' ? k : (k.keyword || k.term || '')).join(', ') === config.search_terms
      });
    }
    
    if (!hasSearchTerms) {
      console.log('❌ No search terms - opening configuration panel');
      // Open the configuration panel so the user can complete required fields
      setShowConfig(true);
      return;
    }
    
    if (!hasLocationOrRemote) {
      console.log('❌ No location or remote - opening configuration panel');
      // Show toast notification for missing location/remote
      alert('Bitte geben Sie einen Ort ein oder aktivieren Sie die Remote-Option, bevor Sie die Jobsuche starten.');
      setShowConfig(true);
      return;
    }
    
    console.log('✅ All requirements met - starting job search...');
    handleStartJob();
  };

  const handleManualJobSubmit = async (input: string) => {
    try {
      setIsProcessingManualJob(true);
      console.log("🔵 Manual job submission started:", input.substring(0, 100) + "...");
      
      const response = await fetch('http://127.0.0.1:5002/api/manual-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API response error:", response.status, errorText);
        
        // Enhanced error handling with user-friendly messages
        let errorMessage = 'Server error occurred';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = response.status === 500 ? 'Internal server error - please try again' :
                        response.status === 400 ? 'Invalid input provided' :
                        `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Manual job processing result:", result);
      
      if (result.success && result.application) {
        // Close the manual job modal
        setShowManualJobModal(false);
        
        // Route through ApplicationApproval component for "Weiter" flow
        setGeneratedApplications([result.application]);
        setShowApplicationApproval(true);
        
        // Show success message
        addToast("success", "Bewerbungsentwurf erstellt - bitte prüfen und genehmigen");
        console.log("✅ Manual job application draft created, routing to approval");
        
      } else {
        const errorMsg = result.error || 'Unbekannter Fehler beim Erstellen der Bewerbung';
        console.error("❌ Backend processing failed:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("❌ Manual job submission failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addToast("error", `Fehler bei der Bewerbungserstellung: ${errorMessage}`);
    } finally {
      setIsProcessingManualJob(false);
      console.log("🔵 Manual job submission completed");
    }
  };



  // Calculate error count in logs
  const errorCount = logs.filter(log => 
    log.includes('ERROR') || log.includes('Failed') || log.includes('Error')
  ).length;

  // Show toast for backend errors
  useEffect(() => {
    if (error) {
      addToast("error", error);
    }
  }, [error]);


  // Auto-open LogModal when logs tab is selected - REMOVED
  // Now all tabs open separate modals instead of showing content in limited space


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-4000"></div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Fixed Header with Tabs - Moved to top */}
        <div className="flex-shrink-0">
          <Header 
            onConfigClick={() => setShowConfig(true)}
            isRunning={isRunning}
          />
          
          {/* Tab Navigation - Moved from bottom to header area */}
          <div className="px-6 pb-4">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl backdrop-blur-sm">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowJobsModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne Jobs in separatem Fenster"
              >
                📋 Jobs ({jobs.length})
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLogModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne System-Logs in separatem Fenster"
              >
                🪵 Logs ({logs.length})
                {errorCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {errorCount}
                  </motion.span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDraftsModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne Bewerbungs-Entwürfe in separatem Fenster"
              >
                📝 Entwürfe
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAnalyticsModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne Analytics in separatem Fenster"
              >
                📊 Analytics
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSchedulerModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne Scheduler in separatem Fenster"
              >
                🤖 Scheduler
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowControlModal(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 text-white/70 hover:text-white hover:bg-white/10"
                title="Öffne Prozess-Kontrolle in separatem Fenster"
              >
                🎮 Control
              </motion.button>
            </div>
          </div>
        </div>

        {/* Global Progress Bar - Replaces WorkflowStepper */}
        <GlobalProgressBar progress={progress} isRunning={isRunning} />

        {/* Streamlined Control Panel */}
        <div className="flex-shrink-0 px-6 py-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-glass border border-white/20"
          >
            {/* Active Career Profile Display */}
            {activeCareerProfile && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-3 border border-green-400/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-white/90 font-medium">Aktives Career-Profil:</span>
                    <span className="text-white font-semibold">{activeCareerProfile.profile_name}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={deactivateCareerProfile}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                    title="Career-Profil deaktivieren"
                  >
                    ✕
                  </motion.button>
                </div>
                {activeCareerProfile.description && (
                  <p className="text-xs text-white/60 mt-1 line-clamp-1">{activeCareerProfile.description}</p>
                )}
              </motion.div>
            )}

            {/* Quick Search Bar with integrated tags */}
            <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-sm text-white/70 mb-2">🔍 Schnellsuche</label>
                  <input
                    type="text"
                    value={config.search_terms}
                    onChange={e => setConfig(prev => ({ ...prev, search_terms: e.target.value }))}
                    placeholder="z.B. Gärtner, Verkäufer, Krankenpfleger, Mechaniker..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="flex-shrink-0">
                  <label className="block text-sm text-white/70 mb-2">📍 Ort</label>
                  <input
                    type="text"
                    value={config.location}
                    onChange={e => setConfig(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Stadt oder remote"
                    className="w-48 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="flex-shrink-0">
                  <label className="block text-sm text-white/70 mb-2">🎯 Max Jobs</label>
                  <input
                    type="number"
                    value={config.max_jobs}
                    onChange={e => setConfig(prev => ({ ...prev, max_jobs: parseInt(e.target.value) || 15 }))}
                    min="1"
                    max="50"
                    className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-center"
                    title="Maximale Anzahl der zu suchenden Jobs"
                  />
                </div>
              </div>
              
              {/* Search suggestion tags integrated */}
              <div>
                <h4 className="text-xs text-white/60 mb-2 flex items-center gap-2">
                  💡 Beliebte Suchbegriffe
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Projektmanager', 'Vertrieb', 'Buchhaltung', 'Customer Success', 'HR', 'Grafik Design', 'Logistik'].map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setConfig(prev => {
                          const currentTerms = prev.search_terms.trim();
                          const newTerms = currentTerms 
                            ? `${currentTerms}, ${suggestion}`
                            : suggestion;
                          return { ...prev, search_terms: newTerms };
                        });
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs hover:bg-white/20 transition-all"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>


            {/* Main Action Buttons - Clean layout */}
            <div className="flex gap-3 justify-center">
              {!isRunning ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const canStart = (config.search_terms || config.job_title || '').trim().length >= 2 && (config.remote || (config.location && config.location.trim().length > 0));
                    if (canStart) {
                      handlePrimaryAction();
                    } else {
                      // Show helpful message
                      const missingField = (config.search_terms || config.job_title || '').trim().length < 2 
                        ? 'Suchbegriffe' 
                        : 'Ort (oder aktiviere Remote-Option)';
                      addToast("error", `Bitte ${missingField} eingeben, um die Jobsuche zu starten.`);
                    }
                  }}
                  disabled={false}
                  className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                    (config.search_terms || config.job_title || '').trim().length >= 2 && (config.remote || (config.location && config.location.trim().length > 0))
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-gray-500 to-gray-600 opacity-70 cursor-not-allowed'
                  }`}
                  title={
                    (config.search_terms || config.job_title || '').trim().length >= 2 && (config.remote || (config.location && config.location.trim().length > 0))
                      ? 'Starte die Job-Suche' 
                      : ((config.search_terms || config.job_title || '').trim().length < 2)
                        ? 'Bitte Suchbegriffe eingeben'
                        : 'Bitte Ort eingeben oder Remote-Option aktivieren'
                  }
                >
                  🚀 Start
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stopJobSearch}
                  disabled={!canStop}
                  className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                    canStop
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title="Stoppe die Job-Suche"
                >
                  ⏹️ Stoppen
                </motion.button>
              )}

              {/* Reset - Only when not running */}
              {!isRunning && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 shadow-lg hover:shadow-xl"
                  title="Setzt nur die Suchkonfiguration zurück - Logs und Daten bleiben erhalten"
                >
                  🔄 Reset
                </motion.button>
              )}
            </div>

            {/* Status Messages - Simplified */}
            {(currentStage || statusMessage || error) && (
              <div className="mt-4 text-center">
                {error && (
                  <div className="text-red-400 text-sm mb-2">❌ {error}</div>
                )}
                {currentStage && (
                  <div className="text-blue-200 text-sm mb-1">{currentStage}</div>
                )}
                {statusMessage && (
                  <div className="text-white/70 text-xs">{statusMessage}</div>
                )}
              </div>
            )}

            {/* Secondary Actions Row - Smaller, less prominent */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowProfileManager(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30"
                title="Such-Vorlagen verwalten - Erstellen, Bearbeiten, Anwenden"
              >
                📝 Such-Vorlagen ({searchProfiles.length})
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowManualJobModal(true)}
                disabled={isProcessingManualJob}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 ${
                  !isProcessingManualJob
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30'
                    : 'bg-gray-500/50 cursor-not-allowed opacity-50 border border-gray-400/20'
                }`}
                title="Stellenausschreibung manuell eingeben"
              >
                📝 Manuelle Stellenausschreibung
              </motion.button>
            </div>
            
            {/* Tips section - moved to bottom */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-blue-500/10 rounded-lg p-4 border border-blue-400/20"
            >
              <div className="flex items-start gap-3">
                <div className="text-blue-400 text-lg">💡</div>
                <div>
                  <h4 className="text-sm text-blue-200 font-medium mb-1">Tipp für bessere Ergebnisse</h4>
                  <p className="text-xs text-blue-100/80">
                    Kombiniere mehrere Suchbegriffe mit Komma: "Verkäufer, Einzelhandel" für präzisere Stellenausschreibungen.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>


        {/* Overlay während Bewerbungserstellung */}
        <GenerationOverlay 
          active={currentStage === 'Bewerbungserstellung' && !showApplicationApproval}
          current={generationInfo.current}
          total={generationInfo.total || 0}
          message={statusMessage}
        />
      </div>

      <JobSelection
        jobs={rankedJobs}
        onJobsSelected={submitJobSelection}
        onCancel={cancelInteractiveFlow}
        isVisible={showJobSelection}
      />

      <ApplicationApproval
        applications={generatedApplications}
        onApprove={handleApplicationApproval}
        onCancel={handleCancelFlow}
        isVisible={showApplicationApproval}
      />

      {/* Config Panel Modal */}
      <AnimatePresence>
        {showConfig && (
          <ConfigPanel
            config={config}
            setConfig={setConfig}
            onClose={() => setShowConfig(false)}
            showCareerProfileManager={showCareerProfileManager}
            setShowCareerProfileManager={setShowCareerProfileManager}
            getStorageRetentionDays={getStorageRetentionDays}
            setStorageRetentionDays={setStorageRetentionDays}
          />
        )}
      </AnimatePresence>

      {/* Profile Manager Modal */}
      <SuchVorlagenManagerModal
        visible={showProfileManager}
        onClose={() => setShowProfileManager(false)}
        onCreateNew={() => {
          setCurrentProfile(null);
          setShowProfileEditor(true);
          // Keep ProfileManager open - don't close it
        }}
        onEditSuchVorlagen={(profile) => {
          setCurrentProfile(profile);
          setShowProfileEditor(true);
          // Keep ProfileManager open - don't close it
        }}
        onApplySuchVorlagen={(profile) => {
          // Extract keywords and set them in search terms
          const keywords = profile.keywords.map(k => 
            typeof k === 'string' ? k : (k.keyword || k.term || '')
          ).filter(k => k.trim().length > 0);
          
          console.log('🔧 Applying profile settings:', {
            profile_max_jobs: profile.search_settings?.max_jobs,
            current_config_max_jobs: config.max_jobs,
            profile_structure: profile.search_settings
          });
          
          // Apply all profile settings to config
          const updatedConfig = {
            ...config,
            search_terms: keywords.join(', '),
            location: profile.filters?.location 
              ? (Array.isArray(profile.filters.location) 
                  ? profile.filters.location.join(', ') 
                  : profile.filters.location)
              : config.location,
            max_jobs: profile.search_settings?.max_jobs || config.max_jobs,
            providers: {
              jsearch: profile.search_settings.providers?.jsearch ?? config.providers.jsearch,
              adzuna: profile.search_settings.providers?.adzuna ?? config.providers.adzuna,
              stepstone: profile.search_settings.providers?.stepstone ?? config.providers.stepstone,
            }
          };
          
          setConfig(updatedConfig);
          
          console.log('🎯 Profile applied - Updated config:', updatedConfig);
          
          console.log('✅ Profile applied with settings:', {
            keywords: keywords.join(', '),
            max_jobs: profile.search_settings.max_jobs,
            providers: profile.search_settings.providers
          });
          
          if (keywords.length > 0) {
            addToast("success", `Such-Vorlage "${profile.name}" angewendet - Alle Einstellungen übernommen`);
          } else {
            addToast("error", `Such-Vorlage "${profile.name}" angewendet - Keine Stichwörter gefunden`);
          }
          setCurrentProfile(profile);
        }}
        onDeleteSuchVorlagen={handleDeleteProfile}
        profiles={searchProfiles}
        onRefreshSuchVorlagen={loadProfiles}
      />

      {/* Profile Wizard Modal */}
      <AnimatePresence>
        {showProfileEditor && (
          <ProfileWizard
            visible={showProfileEditor}
            initialProfile={currentProfile}
            onSave={(p)=>{
              handleSaveProfile(p); 
              setShowProfileEditor(false);
              // Close ProfileManager after save
              setShowProfileManager(false);
            }}
            onCancel={()=>{
              setShowProfileEditor(false);
              // Return to ProfileManager (keep it open)
              // Don't close ProfileManager here
            }}
          />
        )}
      </AnimatePresence>

      {/* System-Logs Modal */}
      <LogModal
        visible={showLogModal}
        logs={logs}
        onClose={() => setShowLogModal(false)}
      />

      {/* Tab Modals */}
      <TabModal
        visible={showJobsModal}
        title="Jobs"
        icon="📋"
        onClose={() => setShowJobsModal(false)}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* Jobs Management Header */}
          <div className="mb-6 flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Job Verwaltung</h3>
              <p className="text-sm text-white/70">Verstecken, löschen und verwalten Sie Ihre gefundenen Jobs</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHiddenJobs(!showHiddenJobs)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                showHiddenJobs
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                  : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
              }`}
              title={showHiddenJobs ? 'Versteckte Jobs ausblenden' : 'Versteckte Jobs anzeigen'}
            >
              {showHiddenJobs ? '👁️‍🗨️' : '👁️'} 
              <span>{showHiddenJobs ? 'Versteckte ausblenden' : 'Versteckte anzeigen'}</span>
            </motion.button>
          </div>

          <JobDisplay 
            jobs={jobs}
            onHideJob={hideJob}
            onDeleteJob={deleteJob}
            onUnhideJob={unhideJob}
            showHiddenJobs={showHiddenJobs}
            ageFilter={{
              enabled: ageFilterEnabled,
              maxDays: ageFilterMaxDays,
              onToggle: setAgeFilterEnabled,
              onMaxDaysChange: setAgeFilterMaxDays,
              options: ageFilterOptions
            }}
            applicationStatusMap={applicationStatusMap}
            onLoadApplicationStatus={getApplicationStatus}
            // 🎯 Confirmation Dialog Functions
            onShowDeleteConfirmation={showDeleteConfirmation}
          />
        </div>
      </TabModal>

      <TabModal
        visible={showDraftsModal}
        title="Bewerbungs-Entwürfe"
        icon="📝"
        onClose={() => setShowDraftsModal(false)}
      >
        <div className="p-6 h-full overflow-y-auto">
          <DraftManager />
        </div>
      </TabModal>

      <TabModal
        visible={showAnalyticsModal}
        title="Analytics"
        icon="📊"
        onClose={() => setShowAnalyticsModal(false)}
      >
        <div className="h-full overflow-y-auto">
          <AnalyticsDashboard className="h-full" />
        </div>
      </TabModal>

      <TabModal
        visible={showSchedulerModal}
        title="Scheduler"
        icon="🤖"
        onClose={() => setShowSchedulerModal(false)}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* <SchedulerPanel /> */}
          <div className="text-center text-gray-500 py-8">
            <p>🚧 Scheduler ist temporär deaktiviert</p>
            <p className="text-sm mt-2">Feature wird überarbeitet</p>
          </div>
        </div>
      </TabModal>

      <TabModal
        visible={showControlModal}
        title="Prozess-Kontrolle"
        icon="🎮"
        onClose={() => setShowControlModal(false)}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* <ProcessControlPanel /> */}
          <div className="text-center text-gray-500 py-8">
            <p>🚧 Prozess-Kontrolle ist temporär deaktiviert</p>
            <p className="text-sm mt-2">Feature wird überarbeitet</p>
          </div>
        </div>
      </TabModal>

      {/* Manual Job Modal */}
      <ManualJobModal
        visible={showManualJobModal}
        onSubmit={handleManualJobSubmit}
        onCancel={() => setShowManualJobModal(false)}
        isProcessing={isProcessingManualJob}
        activeCareerProfile={activeCareerProfile}
      />

      {/* Career Profile Manager Modal */}
      <CareerProfileManagerModal
        visible={showCareerProfileManager}
        onClose={() => setShowCareerProfileManager(false)}
        onProfileActivated={(profile) => {
          // Update the active career profile state
          setActiveCareerProfile(profile);
          
          // Handle both activation and deactivation
          if (profile) {
            console.log('✅ Career profile activated in App:', profile.profile_name);
            addToast("success", `Career-Profil "${profile.profile_name}" aktiviert`);
          } else {
            console.log('✅ Career profile deactivated in App');
            addToast("success", "Career-Profil deaktiviert");
          }
        }}
      />

      {/* 🎯 Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.type === 'delete' ? 'Job löschen' : 'Job ausblenden'}
        message={confirmationDialog.type === 'delete' ? 'Bist du sicher, dass du diesen Job löschen möchtest?' : 'Bist du sicher, dass du diesen Job ausblenden möchtest?'}
        confirmText={confirmationDialog.type === 'delete' ? 'Löschen' : 'Ausblenden'}
        cancelText="Abbrechen"
        confirmButtonColor={confirmationDialog.type === 'delete' ? 'red' : 'yellow'}
        jobTitle={confirmationDialog.jobTitle}
        onConfirm={confirmAction}
        onCancel={cancelAction}
      />
    </div>
  );
}

export default App;
