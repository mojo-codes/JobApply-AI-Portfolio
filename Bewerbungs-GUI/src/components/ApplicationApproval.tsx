import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddressAutocomplete from './AddressAutocomplete';

interface GeneratedApplication {
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

interface ApplicationApprovalProps {
  applications: GeneratedApplication[];
  onApprove: (payload: { job_id: number; application_text?: string | null; company_address?: string | null; force_pdf?: boolean; company?: string; job_title?: string }[]) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const ApplicationApproval: React.FC<ApplicationApprovalProps> = ({
  applications,
  onApprove,
  onCancel,
  isVisible
}) => {
  const [approvedApps, setApprovedApps] = useState<Set<number>>(new Set());
  const [currentApp, setCurrentApp] = useState(0);
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<Set<number>>(new Set());
  const [addressInputs, setAddressInputs] = useState<Record<number, string>>({});
  const [editedSubjects, setEditedSubjects] = useState<Record<number, string>>({});

  // Reset approved apps when new applications arrive
  useEffect(() => {
    setApprovedApps(new Set());
    setCurrentApp(0);
    setEditedTexts({});
    setEditing(new Set());
    setEditedSubjects({});
  }, [applications]);

  // Initialize company address inputs for each application
  useEffect(() => {
    setAddressInputs(prev => {
      const newInputs = { ...prev };
      let hasChanges = false;
      
      applications.forEach(app => {
        if (!(app.job_id in newInputs)) {
          // Pre-fill with found address from backend if available
          let prefillAddress = app.found_address || '';
          
          // If no found_address but we have address_info, construct partial address
          if (!prefillAddress && app.address_info) {
            const parts = [];
            // 🔧 FIXED: Format address like it will appear in PDF (separate lines)
            if (app.address_info.street_lines && Array.isArray(app.address_info.street_lines)) {
              // Use separate street lines if available
              parts.push(...app.address_info.street_lines);
            } else if (app.address_info.street) {
              parts.push(app.address_info.street);
            }
            
            if (app.address_info.postal_code && app.address_info.city) {
              parts.push(`${app.address_info.postal_code} ${app.address_info.city}`);
            } else if (app.address_info.city) {
              parts.push(app.address_info.city);
            }
            
            // Use newlines instead of commas to match PDF formatting
            prefillAddress = parts.join('\n');
          }
          
          newInputs[app.job_id] = prefillAddress;
          hasChanges = true;
        }
      });
      
      return hasChanges ? newInputs : prev;
    });
  }, [applications]);

  // Helper function to parse subject from application text
  const parseSubject = (text: string): string => {
    const match = text.match(/^Betreff:\s*(.+?)(?:\n|$)/);
    return match ? match[1].trim() : '';
  };

  // Helper function to rebuild application text with new subject
  const rebuildApplicationText = (originalText: string, newSubject: string): string => {
    // Remove existing subject line if present
    const withoutSubject = originalText.replace(/^Betreff:\s*(.+?)(?:\n|$)/, '');
    
    // Add new subject line
    return `Betreff: ${newSubject}\n\n${withoutSubject.trim()}`;
  };

  // Initialize subjects from application texts
  useEffect(() => {
    const newSubjects: Record<number, string> = {};
    applications.forEach(app => {
      if (!editedSubjects[app.job_id]) {
        newSubjects[app.job_id] = parseSubject(app.application_text) || `Bewerbung als ${app.job_title}`;
      }
    });
    
    if (Object.keys(newSubjects).length > 0) {
      setEditedSubjects(prev => ({ ...prev, ...newSubjects }));
    }
  }, [applications]);

  const toggleApproval = (jobId: number) => {
    const newApproved = new Set(approvedApps);
    if (newApproved.has(jobId)) {
      newApproved.delete(jobId);
    } else {
      newApproved.add(jobId);
    }
    setApprovedApps(newApproved);
  };

  const handleSubmit = () => {
    const invalidIds: number[] = [];
    const missingCompanies: string[] = [];
    
    approvedApps.forEach(id => {
      const addr = addressInputs[id]?.trim();
      if (!addr) {
        invalidIds.push(id);
        const app = applications.find(a => a.job_id === id);
        if (app) missingCompanies.push(app.company);
      }
    });

    let forceIds: Set<number> = new Set();
    if (invalidIds.length) {
      const companiesText = missingCompanies.length <= 3 
        ? missingCompanies.join(', ')
        : `${missingCompanies.slice(0, 3).join(', ')} und ${missingCompanies.length - 3} weitere`;
        
      const proceed = window.confirm(
        `⚠️ Fehlende Adressen für ${invalidIds.length} Bewerbung(en):\n\n` +
        `${companiesText}\n\n` +
        `Ohne Adresse kann nur eine reduzierte PDF-Version erstellt werden. ` +
        `Möchten Sie trotzdem fortfahren?\n\n` +
        `Tipp: Verwenden Sie die Adress-Autocomplete-Funktion für bessere Ergebnisse.`
      );
      if (!proceed) return;
      forceIds = new Set(invalidIds);
    }

    const payload = Array.from(approvedApps).map(id => {
      const app = applications.find(a => a.job_id === id);
      
      // Get final application text with subject line updates
      let finalText = editedTexts[id] ?? app?.application_text ?? '';
      
      // Apply subject line changes if any
      if (editedSubjects[id]) {
        finalText = rebuildApplicationText(finalText, editedSubjects[id]);
      }
      
      return {
        job_id: id,
        application_text: finalText,
        company_address: addressInputs[id] || null,
        force_pdf: forceIds.has(id) ? true : undefined,
        company: app?.company || 'Unknown Company',
        job_title: app?.job_title || 'Manual Job'
      };
    });
    onApprove(payload);
  };

  if (!isVisible || applications.length === 0) return null;

  const app = applications[currentApp];
  
  // FIXED: Use proper address validation logic (street + city required, postal_code optional)
  // This matches the backend logic in should_create_pdf_with_address() 
  const hasValidAddress = () => {
    const prefilled = addressInputs[app.job_id]?.trim();
    if (prefilled) {
      // User has already entered something
      return true;
    }
    
    // Check if backend found a valid address (street + city)
    const addressInfo = app.address_info || {};
    const hasStreet = addressInfo.street?.trim();
    const hasCity = addressInfo.city?.trim();
    
    // Also check found_address field
    const foundAddress = app.found_address?.trim();
    
    return (hasStreet && hasCity) || foundAddress;
  };
  
  const isPlaceholder = !hasValidAddress();
  const isEditingCurrent = editing.has(app.job_id);

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
          className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex"
        >
          {/* Left Panel - Application List */}
          <div className="w-1/3 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                📄 Bewerbungen ({applications.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {applications.map((application, index) => (
                <motion.div
                  key={application.job_id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentApp(index)}
                  className={`
                    p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 relative
                    ${index === currentApp
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                    }
                  `}
                >
                  {/* Approval Checkbox */}
                  <div className="absolute top-2 right-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleApproval(application.job_id);
                      }}
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${approvedApps.has(application.job_id)
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/30 hover:border-white/50'
                        }
                      `}
                    >
                      {approvedApps.has(application.job_id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="pr-8">
                    <h4 className="text-white font-medium text-sm line-clamp-2 mb-1">
                      {application.job_title}
                    </h4>
                    <p className="text-white/60 text-xs">
                      {application.company}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Panel - Application Preview */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    ✨ Bewerbungs-Review
                  </h2>
                  <p className="text-white/70">
                    {app.job_title} bei {app.company}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">
                    {currentApp + 1} / {applications.length}
                  </span>
                  <button
                    onClick={() => setCurrentApp(Math.max(0, currentApp - 1))}
                    disabled={currentApp === 0}
                    className="p-2 rounded-lg bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentApp(Math.min(applications.length - 1, currentApp + 1))}
                    disabled={currentApp === applications.length - 1}
                    className="p-2 rounded-lg bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Application Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                {/* Company Address Editor with Autocomplete */}
                <div className="mb-6">
                  <label className="text-xs text-white/50 mb-1 block flex items-center justify-between">
                    <span>Unternehmens-Adresse</span>
                    {!isPlaceholder ? (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <span>✅</span>
                        Adresse verfügbar
                      </span>
                    ) : (
                      <span className="text-yellow-400 text-xs flex items-center gap-1">
                        <span>⚠️</span>
                        Adresse benötigt
                      </span>
                    )}
                  </label>
                  
                  <div className={`rounded-lg border-2 transition-all ${
                    isPlaceholder && !addressInputs[app.job_id]?.trim() 
                      ? 'border-yellow-500/50 bg-yellow-500/5' 
                      : addressInputs[app.job_id]?.trim()
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-white/10 bg-white/5'
                  }`}>
                    <AddressAutocomplete
                      value={addressInputs[app.job_id] || ''}
                      onChange={(value) => setAddressInputs(prev => ({ ...prev, [app.job_id]: value }))}
                      placeholder={isPlaceholder 
                        ? `Adresse für ${app.company} eingeben:\n\nStraße Hausnummer\nPLZ Stadt`
                        : `Mehrzeilige Adresse möglich:\n\nStraße Hausnummer\nPLZ Stadt\n(z.B. Musterstraße 1\n12345 Berlin)`
                      }
                      className={`border-0 rounded-xl ${
                        isPlaceholder && !addressInputs[app.job_id]?.trim()
                          ? 'bg-transparent placeholder-yellow-300/80'
                          : 'bg-transparent'
                      }`}
                      isPrefilled={!isPlaceholder}
                      onGeolocationRequest={() => {
                        // Optional: Show a toast notification about geolocation usage
                        console.log('Geolocation requested for company address');
                      }}
                    />
                  </div>
                  
                  {/* Single clear success message when address is provided */}
                  {addressInputs[app.job_id]?.trim() && (
                    <p className="text-green-400/90 text-xs mt-2 flex items-center gap-1">
                      <span>✅</span>
                      Adresse verfügbar – Vollständige PDF-Erstellung möglich
                    </p>
                  )}
                </div>

                <div className="mb-4 pb-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    📝 {app.filename.replace(/(_\d{8}_\d{6})?\.txt$/, '').replace(/_/g, ' ')}
                  </h3>
                  <p className="text-white/60 text-sm">
                    Gespeichert unter: {app.pdf_path || app.file_path || 'Pfad wird nach PDF-Erstellung verfügbar'}
                  </p>
                </div>

                {/* Subject Line Editor */}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-white/60">Betreff:</span>
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">editierbar</span>
                  </div>
                  <input
                    type="text"
                    value={editedSubjects[app.job_id] || ''}
                    onChange={(e) => setEditedSubjects(prev => ({ ...prev, [app.job_id]: e.target.value }))}
                    className="w-full p-2 rounded-lg bg-white/5 text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-yellow-300/30 hover:border-yellow-400/50"
                    placeholder="Betreff eingeben..."
                  />
                </div>

                {isEditingCurrent ? (
                  <textarea
                    className="w-full h-96 p-3 rounded-lg bg-white/5 text-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editedTexts[app.job_id] ?? app.application_text}
                    onChange={e => setEditedTexts(prev => ({ ...prev, [app.job_id]: e.target.value }))}
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed font-sans">
                      {editedTexts[app.job_id] ?? app.application_text}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-white/70">
                  {approvedApps.size} von {applications.length} Bewerbungen genehmigt
                </div>
                
                <button
                  onClick={() => {
                    const newSet = new Set(editing);
                    if (newSet.has(app.job_id)) newSet.delete(app.job_id); else newSet.add(app.job_id);
                    setEditing(newSet);
                    setEditedTexts(prev => ({ ...prev, [app.job_id]: prev[app.job_id] ?? app.application_text }));
                  }}
                  className="px-3 py-1 rounded-lg text-sm bg-white/10 text-white/60 hover:bg-white/20"
                >
                  {isEditingCurrent ? 'Fertig bearbeiten' : 'Text bearbeiten'}
                </button>
              </div>
              
              <div className="flex gap-3 flex-wrap justify-end">
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
                  className={`
                    px-6 py-2 rounded-xl font-medium transition-all
                    ${approvedApps.size > 0
                      ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/10 text-white/50 cursor-not-allowed'
                    }
                  `}
                  disabled={approvedApps.size === 0}
                >
                  {approvedApps.size > 0
                    ? `${approvedApps.size} Bewerbungen finalisieren`
                    : 'Bewerbungen auswählen'
                  }
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};