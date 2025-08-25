//
// This file is intentionally left blank to reset its state.
//

import React, { useCallback, useState, useEffect } from 'react';
import { Command, Child } from '@tauri-apps/api/shell';
import { writeTextFile } from '@tauri-apps/api/fs';
import { save } from '@tauri-apps/api/dialog';
import { useToast } from '../components/ToastProvider';

// ===== TYPE DEFINITIONS =====
export interface JobEvent {
  timestamp: string;
  stage: 'initializing' | 'searching' | 'ranking' | 'user_selection' | 'generating' | 'user_approval' | 'complete' | 'heartbeat';
  progress: number;
  status: 'running' | 'success' | 'error' | 'cancelled';
  data: { [key: string]: any };
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  platform: string;
  url: string;
  relevance_score: number;
  ml_score?: number;
  combined_score?: number;
  applied: boolean;
  description?: string;
  salary_info?: string;
  date_posted?: string;
  first_seen?: string;
  date_added?: string;
  is_new_since_last_search?: boolean;
  is_hidden?: boolean;
  ampel?: {
    color: 'green' | 'yellow' | 'red';
    label: string;
    priority: number;
    percentile: number;
    score_tier: string;
  };
}

export interface GeneratedApplication {
  job_id: number;
  job_title: string;
  company: string;
  application_text: string;
  filename: string;
  file_path: string;
  pdf_path?: string | null;
  found_address?: string;
  address_info?: any;
  address_available?: boolean;
}

export interface JobSearchConfig {
  job_title?: string;
  search_terms: string;
  location: string;
  remote: boolean;
  max_jobs: number | "";
  job_age_days?: number;
  providers: {
    jsearch: boolean;
    adzuna: boolean;
    stepstone: boolean;
  };
  profile_path?: string;
  salary_min?: number;
  salary_max?: number;
  remote_only?: boolean;
  // Job filtering options
  age_filter?: {
    enabled: boolean;
    max_days: number;
    options: Array<{ label: string; days: number }>;
  };
}

// Payload that ApplicationApproval returns after user review
export type ApprovalPayload = { job_id: number; application_text?: string | null; company_address?: string | null; force_pdf?: boolean; company?: string; job_title?: string }[];

export interface JobAgent {
  isRunning: boolean;
  progress: number;
  currentStage: string | null;
  statusMessage: string | null;
  jobs: Job[];
  logs: string[];
  error: string | null;
  startJobSearch: () => Promise<boolean | undefined>;
  stopJobSearch: () => Promise<void>;
  canStart: boolean;
  canStop: boolean;
  exportLogs: () => Promise<void>;
  exportJobs: () => Promise<void>;
  config: JobSearchConfig;
  setConfig: React.Dispatch<React.SetStateAction<JobSearchConfig>>;
  
  // 🎯 New Interactive Workflow Properties
  showJobSelection: boolean;
  showApplicationApproval: boolean;
  rankedJobs: Job[];
  generatedApplications: GeneratedApplication[];
  submitJobSelection: (selectedJobIds: (string | number)[]) => Promise<void>;
  submitApplicationApproval: (payload: ApprovalPayload) => Promise<void>;
  cancelInteractiveFlow: () => void;
  resetAll: () => void;
  resetSearchConfig: () => void;
  generationInfo: { current: number; total: number };
  mlWeight: number;
  setMlWeight: React.Dispatch<React.SetStateAction<number>>;
  
  // 🎯 Manual Job Support Functions  
  setGeneratedApplications: React.Dispatch<React.SetStateAction<GeneratedApplication[]>>;
  setShowApplicationApproval: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 🎯 Job Management Functions
  hideJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  unhideJob: (jobId: string) => Promise<void>;
  showHiddenJobs: boolean;
  setShowHiddenJobs: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 🎯 Application Status Functions
  getApplicationStatus: (jobs: Job[]) => Promise<Record<string, any>>;
  applicationStatusMap: Record<string, any>;
  setApplicationStatusMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  
  // 🎯 Job Persistence Functions
  clearPersistedJobs: () => void;
  removeDuplicateJobs: () => void;
  getStorageRetentionDays: () => number;
  setStorageRetentionDays: (days: number) => void;
  
  // 🎯 Confirmation Dialog Functions
  confirmationDialog: {
    isOpen: boolean;
    type: 'delete' | null;
    jobId: string | null;
    jobTitle: string | null;
  };
  showDeleteConfirmation: (jobId: string, jobTitle: string) => void;
  confirmAction: () => void;
  cancelAction: () => void;
}

// ===== JOB PERSISTENCE HELPERS =====
const JOBS_STORAGE_KEY = 'bewerbungshelfer_jobs';
const JOBS_TIMESTAMP_KEY = 'bewerbungshelfer_jobs_timestamp';
const STORAGE_SETTINGS_KEY = 'bewerbungshelfer_storage_settings';

// Job storage duration options (in days)
export const JOB_STORAGE_OPTIONS = [
  { label: '1 Tag', days: 1 },
  { label: '3 Tage', days: 3 },
  { label: '1 Woche', days: 7 },
  { label: '2 Wochen', days: 14 },
  { label: '1 Monat', days: 30 },
  { label: '3 Monate', days: 90 },
  { label: 'Unbegrenzt', days: -1 }
];

const getStorageSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('⚠️ Could not load storage settings:', error);
  }
  // Default: 7 days
  return { maxAgeDays: 7 };
};

const saveStorageSettings = (settings: { maxAgeDays: number }) => {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('⚠️ Could not save storage settings:', error);
  }
};

const getMaxStorageAgeMs = (): number => {
  const settings = getStorageSettings();
  if (settings.maxAgeDays === -1) {
    return Infinity; // Unbegrenzt
  }
  return settings.maxAgeDays * 24 * 60 * 60 * 1000;
};

const loadPersistedJobs = (): Job[] => {
  try {
    const storedJobs = localStorage.getItem(JOBS_STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(JOBS_TIMESTAMP_KEY);
    
    if (!storedJobs || !storedTimestamp) {
      return [];
    }
    
    // Check if stored jobs are too old (using dynamic settings)
    const timestamp = parseInt(storedTimestamp, 10);
    const maxAge = getMaxStorageAgeMs();
    const isExpired = maxAge !== Infinity && (Date.now() - timestamp > maxAge);
    
    if (isExpired) {
      localStorage.removeItem(JOBS_STORAGE_KEY);
      localStorage.removeItem(JOBS_TIMESTAMP_KEY);
      console.log('🗑️ Expired jobs removed from localStorage');
      return [];
    }
    
    const jobs = JSON.parse(storedJobs) as Job[];
    console.log(`📂 Loaded ${jobs.length} persisted jobs from localStorage`);
    return jobs;
  } catch (error) {
    console.error('❌ Error loading persisted jobs:', error);
    return [];
  }
};

const saveJobsToStorage = (jobs: Job[]): void => {
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    localStorage.setItem(JOBS_TIMESTAMP_KEY, Date.now().toString());
    console.log(`💾 Saved ${jobs.length} jobs to localStorage`);
  } catch (error) {
    console.error('❌ Error saving jobs to localStorage:', error);
  }
};

const mergeJobs = (existingJobs: Job[], newJobs: Job[]): Job[] => {
  // Create maps for different types of duplicate detection
  const existingJobsMap = new Map(existingJobs.map(job => [job.id, job]));
  const existingJobsUrlMap = new Map(existingJobs.map(job => [job.url.toLowerCase(), job]));
  const existingJobsSignatureMap = new Map(existingJobs.map(job => [
    generateJobSignature(job), job
  ]));
  
  // Add new jobs that don't already exist
  const mergedJobs = [...existingJobs];
  let addedCount = 0;
  let duplicatesSkipped = 0;
  
  for (const newJob of newJobs) {
    const newJobSignature = generateJobSignature(newJob);
    const normalizedUrl = newJob.url.toLowerCase();
    
    if (existingJobsMap.has(newJob.id)) {
      // Job with same ID exists - update it
      const existingJobIndex = mergedJobs.findIndex(job => job.id === newJob.id);
      if (existingJobIndex !== -1) {
        mergedJobs[existingJobIndex] = { ...mergedJobs[existingJobIndex], ...newJob };
      }
    } else if (existingJobsUrlMap.has(normalizedUrl)) {
      // Job with same URL exists - skip duplicate
      duplicatesSkipped++;
      console.log(`🔄 Skipped duplicate by URL: ${newJob.title} at ${newJob.company}`);
    } else if (existingJobsSignatureMap.has(newJobSignature)) {
      // Job with same company+title exists - skip duplicate
      duplicatesSkipped++;
      console.log(`🔄 Skipped duplicate by signature: ${newJob.title} at ${newJob.company}`);
    } else {
      // New unique job - add it
      mergedJobs.push(newJob);
      addedCount++;
      
      // Update maps for future duplicate detection
      existingJobsMap.set(newJob.id, newJob);
      existingJobsUrlMap.set(normalizedUrl, newJob);
      existingJobsSignatureMap.set(newJobSignature, newJob);
    }
  }
  
  console.log(`🔀 Merged jobs: ${existingJobs.length} existing + ${addedCount} new - ${duplicatesSkipped} duplicates = ${mergedJobs.length} total`);
  return mergedJobs;
};

const generateJobSignature = (job: Job): string => {
  // Create a unique signature based on company + title (case-insensitive, whitespace normalized)
  const company = job.company.toLowerCase().replace(/\s+/g, ' ').trim();
  const title = job.title.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${company}||${title}`;
};

// ===== REACT HOOK =====
export const useJobAgent = (): JobAgent => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>(() => loadPersistedJobs());
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<JobSearchConfig>({
    job_title: '',
    search_terms: '',
    location: '',
    remote: false,
    max_jobs: 15,
    providers: {
      jsearch: true,
      adzuna: true,
      stepstone: false,
    },
    age_filter: {
      enabled: false,
      max_days: 30,
      options: [
        { label: 'Letzte 24 Stunden', days: 1 },
        { label: 'Letzte 3 Tage', days: 3 },
        { label: 'Letzte Woche', days: 7 },
        { label: 'Letzte 2 Wochen', days: 14 },
        { label: 'Letzter Monat', days: 30 },
        { label: 'Letzte 3 Monate', days: 90 }
      ]
    },
  });

  // 🎯 New Interactive Workflow State
  const [showJobSelection, setShowJobSelection] = useState(false);
  const [showApplicationApproval, setShowApplicationApproval] = useState(false);
  const [rankedJobs, setRankedJobs] = useState<Job[]>([]);
  const [generatedApplications, setGeneratedApplications] = useState<GeneratedApplication[]>([]);
  const [currentProcess, setCurrentProcess] = useState<Child | null>(null);

  // 📈 Progress während der Bewerbungserstellung
  const [generationInfo, setGenerationInfo] = useState<{current:number;total:number}>({current:0,total:0});

  const [mlWeight, setMlWeight] = useState<number>(40);
  
  // Job Management State
  const [showHiddenJobs, setShowHiddenJobs] = useState<boolean>(false);
  
  // 🎯 Application Status State
  const [applicationStatusMap, setApplicationStatusMap] = useState<Record<string, any>>({});
  
  // 🎯 Confirmation Dialog State
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | null;
    jobId: string | null;
    jobTitle: string | null;
  }>({
    isOpen: false,
    type: null,
    jobId: null,
    jobTitle: null
  });

  // Toast
  const { addToast } = useToast();

  const setErrorWithToast = (msg: string) => {
    setError(msg);
    addToast('error', msg);
  };

  // 🎯 Get current active profile name for Job API calls
  const getActiveProfileName = async (): Promise<string> => {
    try {
      // First try to get active profile
      const response = await fetch('http://localhost:5001/api/profiles');
      const data = await response.json();
      
      if (data.success && data.profiles && data.profiles.length > 0) {
        // Find active profile or use first one
        const activeProfile = data.profiles.find((p: any) => p.status === 'active') || data.profiles[0];
        return activeProfile.name;
      }
      
      // Fallback if no profiles exist
      return "default_profile";
    } catch (error) {
      console.warn('⚠️ Could not get active profile name, using fallback:', error);
      return "default_profile";
    }
  };

  // 💾 Auto-save jobs to localStorage whenever jobs state changes
  useEffect(() => {
    if (jobs.length > 0) {
      saveJobsToStorage(jobs);
    }
  }, [jobs]);

  // 🔄 Load more jobs from backend cache on startup
  useEffect(() => {
    const loadCachedJobs = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/jobs/cache/stats');
        if (response.ok) {
          const stats = await response.json();
          console.log(`📊 Backend cache has ${stats.count} jobs, frontend has ${jobs.length} jobs`);
          
          // If backend has significantly more jobs, show user info
          if (stats.count > jobs.length + 10) {
            console.log(`💡 Info: Backend-Cache hat ${stats.count} Jobs, Frontend zeigt ${jobs.length} Jobs`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not check backend cache:', error);
      }
    };
    
    loadCachedJobs();
  }, [jobs.length]);



  const startJobSearch = useCallback(async (): Promise<boolean | undefined> => {
    // 🎯 FIXED: Use current config state directly to ensure latest values are used
    const currentKeywords = config.search_terms || config.job_title || '';
    const keywordStr = currentKeywords.trim();
    
    console.log('🔍 StartJobSearch - Using keywords:', keywordStr);
    console.log('🔧 StartJobSearch - Full config:', config);
    
    if (keywordStr.length < 2) {
      setErrorWithToast('Bitte gib mindestens einen Suchbegriff (Job Title) ein.');
      setStatusMessage('Suchbegriff fehlt.');
      return false;
    }

    if (isRunning) {
      setErrorWithToast('Suche bereits aktiv');
      return false;
    }
    
    setIsRunning(true);
    setError(null);
    setLogs([]);
    // 🔧 Don't clear jobs immediately - let them accumulate and be visible
    // Jobs will be updated when new results come in via user_selection_required
    setProgress(0);
    setCurrentStage('Vorbereitung');
    setStatusMessage('Starte Jobsuche...');

    try {
      // 🎯 Build Python command arguments - Include location support
      const args = [
        'python3',
        'job_hunter_ultimate.py',
        '--keywords', keywordStr,
        '--max-jobs', String(config.max_jobs || 15),
        '--interactive',
        '--json-output'
      ];
      
      // Add location if specified (Smart Location Parser will handle "Köln, Remote" → ["Köln", "Remote"])
      if (config.location && config.location.trim()) {
        console.log(`🌍 Location sent to Smart Parser: "${config.location.trim()}"`);
        args.push('--location', config.location.trim());
      }
      
      // Add remote flag if enabled
      if (config.remote) {
        args.push('--remote');
      }
      
      console.log('🚀 StartJobSearch - Command args:', args);
      console.log('🎯 StartJobSearch - Keywords being sent:', keywordStr);
      console.log('📝 StartJobSearch - Original search_terms from config:', config.search_terms);
      console.log('🔧 StartJobSearch - Full config object:', config);
      
      // 🔍 FINAL DEBUG: Log the complete command that will be executed
      console.log('🎯 FINAL COMMAND TO EXECUTE:', args.join(' '));

      // Execute the job search - use the original command name that works with Tauri
      const command = new Command('python3', args.slice(1), {
        cwd: '/path/to/job-application-system'
      });
      
      command.stdout.on('data', (line) => {
        const logEntry = `${line}`;
        setLogs(prev => [...prev, logEntry]);
        
        try {
          const parsed = JSON.parse(line);
          console.log('🔍 Parsed JSON event:', parsed.type, parsed);
          
          if (parsed.type === 'stage_change') {
            setCurrentStage(parsed.stage);
            
            // 🔧 FIX: Handle progress messages during Bewerbungserstellung
            if (parsed.stage === 'Bewerbungserstellung' && parsed.message) {
              // Parse messages like "1/2 Entwürfe generiert"
              const progressMatch = parsed.message.match(/(\d+)\/(\d+)\s+Entwürfe generiert/);
              if (progressMatch) {
                const current = parseInt(progressMatch[1], 10);
                const total = parseInt(progressMatch[2], 10);
                setGenerationInfo({ current, total });
                // Don't show the backend message since we have our own counter
                setStatusMessage('Generiere Bewerbungen...');
              } else {
                // Parse initial message like "Erstelle Bewerbungen für 3 Jobs..."
                const initialMatch = parsed.message.match(/Erstelle Bewerbungen für (\d+) Jobs/);
                if (initialMatch) {
                  const total = parseInt(initialMatch[1], 10);
                  setGenerationInfo(prev => ({ ...prev, total }));
                  setStatusMessage('Starte Bewerbungserstellung...');
                } else {
                  setStatusMessage(parsed.message);
                }
              }
            } else {
              setStatusMessage(parsed.message);
            }
            
            setProgress(parsed.progress || 0);
          } else if (parsed.type === 'user_selection_required') {
            console.log('🎯 USER SELECTION REQUIRED event received!', parsed);
            setRankedJobs(parsed.ranked_jobs || []);
            // 🔧 IMPORTANT: Merge new jobs with existing persisted jobs
            setJobs(prev => mergeJobs(prev, parsed.ranked_jobs || []));
            setShowJobSelection(true);
            setCurrentStage('Auswahl erforderlich');
            setStatusMessage(`${parsed.ranked_jobs?.length || 0} Jobs gefunden - Auswahl erforderlich`);
            // IMPORTANT: Keep the process running and available for job selection
            console.log('🎯 Keeping process alive for job selection, currentProcess:', !!command);
            console.log('🎯 ShowJobSelection set to:', true);
          } else if (parsed.type === 'user_approval_required') {
            console.log('🎯 USER APPROVAL REQUIRED event received!', parsed);
            setGeneratedApplications(parsed.applications || []);
            setShowApplicationApproval(true);
            setCurrentStage('Genehmigung erforderlich');
            setStatusMessage(`${parsed.applications?.length || 0} Bewerbungen zur Genehmigung`);
            
            // 🔧 FIX: Update generation info current to show completion
            setGenerationInfo(prev => ({ ...prev, current: parsed.applications?.length || 0 }));
          } else if (parsed.type === 'final_results') {
            // 🔧 Merge final results with existing persisted jobs
            // This ensures previously found jobs remain visible for review
            if (parsed.jobs && parsed.jobs.length > 0) {
              setJobs(prev => mergeJobs(prev, parsed.jobs));
            }
            setCurrentStage('Abgeschlossen');
            setStatusMessage(`${parsed.jobs?.length || 0} Jobs erfolgreich verarbeitet`);
            setProgress(100);
            setIsRunning(false);
            setCurrentProcess(null); // Only clear process when completely done
          }
        } catch (e) {
          // Not JSON, just a regular log line
          if (line.trim().length > 0 && !line.includes('urllib3') && !line.includes('NotOpenSSLWarning')) {
            console.log('📝 Log line:', line.trim());
          }
        }
      });

      command.on('error', (error) => {
        console.error('🔥 Command error:', error);
        setErrorWithToast(`Prozess-Fehler: ${error}`);
        setIsRunning(false);
        setCurrentProcess(null);
        setShowJobSelection(false);
        setShowApplicationApproval(false);
      });

      command.on('close', (code) => {
        console.log(`🔚 Job search completed with code: ${code}`);
        // Only reset state if we're not in an interactive phase
        if (!showJobSelection && !showApplicationApproval) {
          setIsRunning(false);
          setCurrentProcess(null);
          setCurrentStage('Abgeschlossen');
          // Remove the confusing code display - just show "Abgeschlossen"
          setStatusMessage('');
        } else {
          console.log('🎯 Process ended but keeping state for interactive phase');
          // Process ended but we're still in interactive mode - this is unexpected
          const codeValue = typeof code === 'object' ? JSON.stringify(code) : String(code);
          if (codeValue !== '0') {
            setError(`Python-Prozess unerwartet beendet (Code: ${codeValue})`);
            setIsRunning(false);
            setCurrentProcess(null);
            setShowJobSelection(false);
            setShowApplicationApproval(false);
          }
        }
      });

      const child = await command.spawn();
      setCurrentProcess(child);
      console.log('🎯 Command spawned successfully, currentProcess set:', !!command);
      return true;
    } catch (error) {
      console.error('Error starting job search:', error);
      setErrorWithToast(`Fehler beim Starten der Jobsuche: ${error}`);
      setIsRunning(false);
      setCurrentStage('Fehler');
      setStatusMessage('Jobsuche fehlgeschlagen');
      return false;
    }
  }, [config, isRunning, showJobSelection, showApplicationApproval]);

  const stopJobSearch = useCallback(async (): Promise<void> => {
    if (!isRunning) return;
    
    try {
      // Kill the current process if it exists
      if (currentProcess) {
        try {
          // Send cancel signal to Python process via stdin
          await currentProcess.write(JSON.stringify({type: 'cancel'}) + '\n');
          console.log('✅ Cancel signal sent to process');
        } catch (writeError) {
          console.warn('⚠️ Could not send cancel signal:', writeError);
        }
        
        // Give the process a moment to clean up, then force kill if needed
        setTimeout(async () => {
          try {
            // Force terminate the process using Tauri command
            const { Command } = await import('@tauri-apps/api/shell');
            const killCommand = new Command('pkill', ['-f', 'job_hunter_ultimate.py']);
            await killCommand.execute();
            console.log('✅ Process force-killed via pkill');
          } catch (killError) {
            console.warn('⚠️ Force kill failed:', killError);
          }
        }, 2000);
      }
      
      setIsRunning(false);
      setCurrentProcess(null);
      setCurrentStage('Gestoppt');
      setStatusMessage('Jobsuche wurde gestoppt');
      setShowJobSelection(false);
      setShowApplicationApproval(false);
    } catch (e: any) {
      console.error('❌ Error stopping process:', e);
      setError(`Fehler beim Stoppen: ${e.message}`);
      // Force reset state even if stopping fails
      setIsRunning(false);
      setCurrentProcess(null);
      setShowJobSelection(false);
      setShowApplicationApproval(false);
    }
  }, [isRunning, currentProcess]);

  // 🎯 New Interactive Functions
  const submitJobSelection = useCallback(async (selectedJobIds: (string | number)[]): Promise<void> => {
    console.log('🎯 submitJobSelection called with:', selectedJobIds);
    console.log('🔍 currentProcess state:', currentProcess);
    console.log('🔍 currentProcess type:', typeof currentProcess);
    console.log('🔍 currentProcess constructor:', currentProcess?.constructor?.name);
    console.log('🔍 currentProcess keys:', currentProcess ? Object.keys(currentProcess) : 'null');
    console.log('🔍 currentProcess methods:', currentProcess ? Object.getOwnPropertyNames(Object.getPrototypeOf(currentProcess)) : 'null');
    console.log('🔍 isRunning state:', isRunning);
    
    if (!currentProcess) {
      console.error('❌ No current process available for job selection');
      setError('Kein aktiver Prozess für Job-Auswahl verfügbar');
      return;
    }

    if (!isRunning) {
      console.error('❌ Process not running for job selection');
      setError('Prozess läuft nicht für Job-Auswahl');
      return;
    }

    try {
      setShowJobSelection(false);
      setCurrentStage('Verarbeite Auswahl...');
      setStatusMessage(`Verarbeite ${selectedJobIds.length} ausgewählte Jobs`);
      setProgress(70);
      
      // 🔧 FIX: Set generation info total to selected jobs count
      setGenerationInfo({ current: 0, total: selectedJobIds.length });

      // 🎯 Prepare selection data for Python process
      const selectionData = JSON.stringify({
        type: 'job_selection',
        selected_job_ids: selectedJobIds.map(id => Number(id))
      }) + '\n';
      
      console.log('📤 Sending selection data to Python process:', selectionData.trim());
      
      try {
        // 🔍 HTTP approach: Send selection to backend API
        console.log('📡 Sending selection data via HTTP to backend');
        
        const response = await fetch('http://localhost:8000/job-selection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'job_selection',
            selected_job_ids: selectedJobIds.map(id => Number(id))
          })
        });
        
        if (response.ok) {
          console.log('✅ Selection data sent successfully via HTTP');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (httpError: any) {
        console.warn('⚠️ HTTP approach failed, trying temp file fallback:', httpError);
        
        try {
          // Fallback: Use temporary file for communication
          const { writeTextFile } = await import('@tauri-apps/api/fs');
          const tmpFilePath = `/tmp/job_selection_${Date.now()}.json`;
          
          console.log('📁 Writing selection to temp file:', tmpFilePath);
          await writeTextFile(tmpFilePath, selectionData);
          
          console.log('✅ Selection data sent successfully via temp file');
        } catch (writeError: any) {
          console.error('❌ Both HTTP and file approaches failed:', writeError);
          throw new Error(`Failed to send data to Python process: ${writeError.message}`);
        }
      }
      
    } catch (e: any) {
      console.error('❌ Error in submitJobSelection:', e);
      setError(`Fehler beim Übermitteln der Job-Auswahl: ${e.message}`);
      // Re-open the modal
      setShowJobSelection(true);
      // Reset status
      setCurrentStage('Auswahl erforderlich');
      setStatusMessage('Job-Auswahl fehlgeschlagen - bitte erneut versuchen');
    }
  }, [currentProcess, config.max_jobs, isRunning]);

  const submitApplicationApproval = useCallback(async (payload: ApprovalPayload): Promise<void> => {
    try {
      setShowApplicationApproval(false);
      // Clear generated applications to prevent cache buildup
      setGeneratedApplications([]);
      setCurrentStage('Finalisiere Bewerbungen...');
      setStatusMessage(`Finalisiere ${payload.length} genehmigte Bewerbungen`);
      setProgress(90);
      
      // Check if this is a manual job (no currentProcess running)
      const isManualJob = !currentProcess || !isRunning;
      
      if (isManualJob) {
        // Manual job finalization - save to Draft API for unified workflow
        console.log('📡 Saving manual jobs to Draft API for unified workflow');
        
        // Send individual draft creation requests for each approved application
        const results = [];
        for (const app of payload) {
          const draftData = {
            company: app.company || 'Unknown Company',
            title: app.job_title || 'Manual Job',
            letter_text: app.application_text,
            company_address: app.company_address,
            source: 'manual_job',
            job_id: app.job_id,
            created_at: new Date().toISOString()
          };
          
          const response = await fetch('http://localhost:8000/drafts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftData)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          results.push(result);
        }
        
        // Check if all requests were successful
        const allSuccessful = results.every(result => result.success !== false);
        if (allSuccessful) {
          console.log('✅ Manual jobs saved to Draft API successfully');
          setCurrentStage('Abgeschlossen');
          setStatusMessage(`${results.length} Bewerbungen als Entwürfe gespeichert`);
          setProgress(100);
          
          // Show success notification and navigate to drafts
          setTimeout(() => {
            setStatusMessage('Bewerbungen in Entwürfe verfügbar - jetzt Smart Edit verwenden!');
            setProgress(0);
            setCurrentStage(null);
            
            // TODO: Navigate to drafts tab - this would need to be passed from parent component
            console.log('🎯 Navigate user to Drafts tab for Smart Edit workflow');
          }, 2000);
        } else {
          const failedResults = results.filter(result => result.success === false);
          throw new Error(`${failedResults.length} Bewerbungen konnten nicht in Entwürfe gespeichert werden`);
        }
      } else {
        // Regular job approval for automated job search
        console.log('📡 Sending application approval via HTTP');
        
        const response = await fetch('http://localhost:8000/application-approval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'application_approval',
            approved_applications: payload
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Application approval sent successfully via HTTP');
      }
      
      // 📊 Auto-sync Analytics after applications are processed
      // Wait a bit for the backend to process and save the applications
      setTimeout(async () => {
        try {
          const response = await fetch('http://localhost:5002/api/analytics/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log('✅ Analytics data synced automatically after application approval');
            }
          }
        } catch (syncError) {
          console.warn('⚠️ Analytics auto-sync failed (non-critical):', syncError);
          // Don't show error to user as this is background sync
        }
      }, 3000); // Wait 3 seconds for backend processing
      
    } catch (e: any) {
      setError(`Fehler beim Übermitteln der Genehmigung: ${e.message}`);
    }
  }, [currentProcess, isRunning]);

  const cancelInteractiveFlow = useCallback(() => {
    setShowJobSelection(false);
    setShowApplicationApproval(false);
    // Clear generated applications to prevent cache buildup
    setGeneratedApplications([]);
    stopJobSearch();
  }, [stopJobSearch]);

  // 🔄 Comprehensive reset function (for internal use)
  const resetAll = useCallback(() => {
    console.log('🔄 Resetting all job agent state');
    
    // Stop any running process
    if (isRunning && currentProcess) {
      currentProcess.kill().catch(console.error);
    }
    
    // Reset all state to initial values
    setIsRunning(false);
    setCurrentProcess(null);
    setProgress(0);
    setCurrentStage(null);
    setStatusMessage(null);
    setJobs([]);
    // Clear persisted jobs from localStorage
    localStorage.removeItem(JOBS_STORAGE_KEY);
    localStorage.removeItem(JOBS_TIMESTAMP_KEY);
    setLogs([]);
    setError(null);
    setShowJobSelection(false);
    setShowApplicationApproval(false);
    setRankedJobs([]);
    setGeneratedApplications([]);
    setGenerationInfo({ current: 0, total: 0 });
    
    // Reset config to defaults
    const defaultConfig: JobSearchConfig = {
      job_title: '',
      search_terms: '',
      location: '',
      remote: false,
      max_jobs: 10,
      job_age_days: 30,
      providers: {
        jsearch: true,
        adzuna: true,
        stepstone: false
      }
    };
    setConfig(defaultConfig);
    
    console.log('✅ Job agent state reset completed');
  }, [isRunning, currentProcess]);

  // 🔄 Selective reset function - only resets search configuration
  // This function is designed to be user-friendly by preserving logs and data
  // while only resetting the search input fields that users want to change
  const resetSearchConfig = useCallback(() => {
    console.log('🔄 Resetting search configuration only');
    
    // Stop any running process
    if (isRunning && currentProcess) {
      currentProcess.kill().catch(console.error);
    }
    
    // Reset only search-related state - PRESERVE logs and data
    setIsRunning(false);
    setCurrentProcess(null);
    setProgress(0);
    setCurrentStage(null);
    setStatusMessage(null);
    setError(null);
    setShowJobSelection(false);
    setShowApplicationApproval(false);
    setGenerationInfo({ current: 0, total: 0 });
    
    // Reset ONLY the search configuration inputs, preserve providers
    setConfig(prev => ({
      ...prev,
      job_title: '',
      search_terms: '',
      location: '',
      remote: false,
      max_jobs: 15,
      job_age_days: 30,
      // Keep current provider settings - don't reset them
      // This preserves user's preferred search provider configuration
    }));
    
    // PRESERVE: logs, jobs, rankedJobs, generatedApplications
    // This ensures users don't lose their search history or generated applications
    console.log('✅ Search configuration reset completed - logs and data preserved');
  }, [isRunning, currentProcess]);

  const exportLogs = async () => {
    if (logs.length === 0) {
      setStatusMessage('Keine Logs zum Exportieren vorhanden.');
      return;
    }
    try {
      const filePath = await save({
        filters: [{ name: 'Text File', extensions: ['txt'] }],
        defaultPath: `job_agent_logs_${new Date().toISOString().slice(0, 10)}.txt`
      });

      if (filePath) {
        await writeTextFile(filePath, logs.join('\n'));
        setStatusMessage('Logs erfolgreich exportiert!');
      } else {
        setStatusMessage('Export abgebrochen.');
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      setStatusMessage(`Fehler beim Exportieren der Logs: ${error}`);
    }
  };

  const exportJobs = async () => {
    if (jobs.length === 0) {
      setStatusMessage('Keine Jobs zum Exportieren vorhanden.');
      return;
    }
    try {
      const filePath = await save({
        filters: [{ name: 'JSON File', extensions: ['json'] }],
        defaultPath: `found_jobs_${new Date().toISOString().slice(0, 10)}.json`
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(jobs, null, 2));
        setStatusMessage('Jobs erfolgreich exportiert!');
      } else {
        setStatusMessage('Export abgebrochen.');
      }
    } catch (error) {
      console.error('Error exporting jobs:', error);
      setStatusMessage(`Fehler beim Exportieren der Jobs: ${error}`);
    }
  };

  // 🎯 Job Management Functions
  const hideJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      // Update local state immediately for responsive UI
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: true } : job
      ));
      setRankedJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: true } : job
      ));

      // 🔧 Try backend API call, but don't fail on 404 (localStorage jobs)
      try {
        const profileName = await getActiveProfileName();
        const response = await fetch('http://localhost:5002/api/jobs/hide', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            job_id: jobId,
            profile_name: profileName
          })
        });

        if (response.ok) {
          console.log('✅ Job hidden in backend cache');
        } else if (response.status === 404) {
          console.log('ℹ️ Job not in backend cache (localStorage job) - frontend-only hide');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (apiError: any) {
        console.warn('⚠️ Backend API call failed, using frontend-only hide:', apiError.message);
      }

      addToast('success', 'Job erfolgreich ausgeblendet');
    } catch (error: any) {
      console.error('Error hiding job:', error);
      addToast('error', `Fehler beim Ausblenden: ${error.message}`);
      
      // Revert local state on error
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: false } : job
      ));
      setRankedJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: false } : job
      ));
    }
  }, [addToast]);

  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      // Update local state immediately for responsive UI
      setJobs(prev => prev.filter(job => job.id !== jobId));
      setRankedJobs(prev => prev.filter(job => job.id !== jobId));

      // 🔧 Try backend API call, but don't fail on 404 (localStorage jobs)
      try {
        const profileName = await getActiveProfileName();
        const response = await fetch('http://localhost:5002/api/jobs/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            job_id: jobId,
            profile_name: profileName
          })
        });

        if (response.ok) {
          console.log('✅ Job deleted from backend cache');
        } else if (response.status === 404) {
          console.log('ℹ️ Job not in backend cache (localStorage job) - frontend-only delete');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (apiError: any) {
        console.warn('⚠️ Backend API call failed, using frontend-only delete:', apiError.message);
      }

      addToast('success', 'Job erfolgreich gelöscht');
    } catch (error: any) {
      console.error('Error deleting job:', error);
      addToast('error', `Fehler beim Löschen: ${error.message}`);
    }
  }, [addToast, jobs]);

  const unhideJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      // Update local state immediately for responsive UI
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: false } : job
      ));
      setRankedJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: false } : job
      ));

      // 🔧 Try backend API call, but don't fail on 404 (localStorage jobs)
      try {
        const profileName = await getActiveProfileName();
        const response = await fetch('http://localhost:5002/api/jobs/unhide', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            job_id: jobId,
            profile_name: profileName
          })
        });

        if (response.ok) {
          console.log('✅ Job unhidden in backend cache');
        } else if (response.status === 404) {
          console.log('ℹ️ Job not in backend cache (localStorage job) - frontend-only unhide');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (apiError: any) {
        console.warn('⚠️ Backend API call failed, using frontend-only unhide:', apiError.message);
      }

      addToast('success', 'Job wieder eingeblendet');
    } catch (error: any) {
      console.error('Error unhiding job:', error);
      addToast('error', `Fehler beim Einblenden: ${error.message}`);
      
      // Revert local state on error
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: true } : job
      ));
      setRankedJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, is_hidden: true } : job
      ));
    }
  }, [addToast]);

  // 🎯 Application Status Function
  const getApplicationStatus = useCallback(async (jobs: Job[]): Promise<Record<string, any>> => {
    try {
      console.log('🔍 Checking application status for', jobs.length, 'jobs');
      
      const response = await fetch('http://localhost:8000/drafts/application-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobs })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Application status fetched:', result.total_applications, 'applications found');
        setApplicationStatusMap(result.application_status);
        return result.application_status;
      } else {
        throw new Error(result.error || 'Failed to get application status');
      }
    } catch (error: any) {
      console.error('Error fetching application status:', error);
      addToast('error', `Fehler beim Laden des Bewerbungsstatus: ${error.message}`);
      return {};
    }
  }, [addToast]);

  // 🎯 Job Persistence Functions
  const clearPersistedJobs = useCallback(() => {
    localStorage.removeItem(JOBS_STORAGE_KEY);
    localStorage.removeItem(JOBS_TIMESTAMP_KEY);
    setJobs([]);
    console.log('🗑️ Manually cleared all persisted jobs');
    addToast('success', 'Gespeicherte Jobs gelöscht');
  }, [addToast]);

  const removeDuplicateJobs = useCallback(() => {
    setJobs(prev => {
      const uniqueJobs = mergeJobs([], prev); // Use empty array as base to force duplicate detection
      const removedCount = prev.length - uniqueJobs.length;
      
      if (removedCount > 0) {
        console.log(`🧹 Removed ${removedCount} duplicate jobs`);
        addToast('success', `${removedCount} Duplikate entfernt`);
      } else {
        console.log('✅ No duplicates found');
        addToast('info', 'Keine Duplikate gefunden');
      }
      
      return uniqueJobs;
    });
  }, [addToast]);

  const getStorageRetentionDays = useCallback((): number => {
    return getStorageSettings().maxAgeDays;
  }, []);

  const setStorageRetentionDays = useCallback((days: number): void => {
    saveStorageSettings({ maxAgeDays: days });
    console.log(`📅 Storage retention updated to ${days === -1 ? 'unlimited' : days + ' days'}`);
    addToast('success', `Speicherdauer geändert: ${days === -1 ? 'Unbegrenzt' : days + ' Tage'}`);
  }, [addToast]);

  // 🎯 Confirmation Dialog Functions
  const showDeleteConfirmation = useCallback((jobId: string, jobTitle: string) => {
    setConfirmationDialog({
      isOpen: true,
      type: 'delete',
      jobId,
      jobTitle
    });
  }, []);


  const confirmAction = useCallback(async () => {
    const { type, jobId } = confirmationDialog;
    
    if (!jobId) return;
    
    setConfirmationDialog({
      isOpen: false,
      type: null,
      jobId: null,
      jobTitle: null
    });

    if (type === 'delete') {
      await deleteJob(jobId);
    }
  }, [confirmationDialog, deleteJob]);

  const cancelAction = useCallback(() => {
    setConfirmationDialog({
      isOpen: false,
      type: null,
      jobId: null,
      jobTitle: null
    });
  }, []);

  return {
    isRunning,
    progress,
    currentStage,
    statusMessage,
    jobs,
    logs,
    error,
    startJobSearch,
    stopJobSearch,
    canStart: !isRunning,
    canStop: isRunning,
    exportLogs,
    exportJobs,
    config,
    setConfig,
    
    // 🎯 New Interactive Properties
    showJobSelection,
    showApplicationApproval,
    rankedJobs,
    generatedApplications,
    submitJobSelection,
    submitApplicationApproval,
    cancelInteractiveFlow,
    resetAll,
    resetSearchConfig,
    generationInfo,
    mlWeight,
    setMlWeight,
    
    // 🎯 Manual Job Support Functions
    setGeneratedApplications,
    setShowApplicationApproval,
    
    // 🎯 Job Management Functions
    hideJob,
    deleteJob,
    unhideJob,
    showHiddenJobs,
    setShowHiddenJobs,
    
    // 🎯 Application Status Functions
    getApplicationStatus,
    applicationStatusMap,
    setApplicationStatusMap,
    
    // 🎯 Job Persistence Functions
    clearPersistedJobs,
    removeDuplicateJobs,
    getStorageRetentionDays,
    setStorageRetentionDays,
    
    // 🎯 Confirmation Dialog Functions
    confirmationDialog,
    showDeleteConfirmation,
    confirmAction,
    cancelAction
  };
}; 