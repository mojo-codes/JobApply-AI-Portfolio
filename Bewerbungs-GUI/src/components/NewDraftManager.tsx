import { useEffect, useState, useRef } from "react";
// import RichTextEditor from "./RichTextEditor"; // Removed - no longer needed
import ConfettiSuccess from "./ConfettiSuccess";
import SimpleExportModal from "./SimpleExportModal";
import FormattedApplicationPreview from "./FormattedApplicationPreview";
import SmartEditPreview, { SmartEditPreviewRef } from "./SmartEditPreview";

type Draft = {
  id: number;
  company: string;
  job_title: string;
  letter_text: string;
  created_at: string;
  updated_at: string;
};

export default function NewDraftManager() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [editableDataMap, setEditableDataMap] = useState<Map<number, any>>(new Map()); // Draft-spezifische Adress-Daten
  const [saveStatus, setSaveStatus] = useState<string | null>(null); // Speicher-Feedback
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [limit] = useState(1000);
  // const [hasMore] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'smart-edit' | 'preview'>('smart-edit');
  
  // Ref for SmartEditPreview to get current editable data
  const smartEditRef = useRef<SmartEditPreviewRef>(null);

  async function loadDrafts(requestLimit?: number) {
    setIsLoading(true);
    setApiError(null);
    const currentLimit = requestLimit ?? limit;
    
    try {
      const res = await fetch(`http://localhost:8000/drafts?limit=${currentLimit}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setDrafts(data);
      
      // setHasMore(data.length === currentLimit);
    } catch (error) {
      console.error("Failed to load drafts:", error);
      setApiError(error instanceof Error ? error.message : "Failed to connect to Draft API");
      setDrafts([]);
      // setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  async function saveDraft(draft: Draft) {
    setSaveStatus("⏳ Speichere...");
    try {
      // 1. Save letter_text to database
      const res = await fetch(`http://localhost:8000/drafts/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_text: draft.letter_text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      // 2. Save editableData (addresses) to localStorage - DRAFT-SPECIFIC
      const draftEditableData = editableDataMap.get(draft.id);
      console.log(`🔍 DEBUG: Saving draft ${draft.id}, editableData:`, draftEditableData);
      if (draftEditableData) {
        localStorage.setItem(`draft_addresses_${draft.id}`, JSON.stringify(draftEditableData));
        console.log(`💾 Saved addresses for draft ${draft.id}:`, draftEditableData);
        setSaveStatus("✅ Gespeichert (inkl. Adressen)!");
      } else {
        console.warn(`⚠️ No editableData to save for draft ${draft.id}`);
        setSaveStatus("✅ Text gespeichert (keine Adress-Änderungen)");
      }
      
      // Feedback nach 2 Sekunden zurücksetzen
      setTimeout(() => setSaveStatus(null), 2000);
      
      loadDrafts();
    } catch (error) {
      console.error("Failed to save draft:", error);
      setSaveStatus("❌ Fehler beim Speichern");
      setTimeout(() => setSaveStatus(null), 3000);
      setApiError(error instanceof Error ? error.message : "Failed to save draft");
    }
  }

  const visibleDrafts = drafts.filter(d =>
    d.company.toLowerCase().includes(filter.toLowerCase()) ||
    d.job_title.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  async function exportSelected(exportPath?: string, customFilename?: string) {
    if (!selectedIds.length) return;
    setExportLoading(true);
    try {
      const requestBody: any = { ids: selectedIds };
      if (exportPath) {
        requestBody.export_path = exportPath;
      }
      
      // Custom filename support für single exports
      if (customFilename && selectedIds.length === 1) {
        requestBody.custom_filename = customFilename;
        console.log(`📝 Using custom filename: ${customFilename}`);
      }
      
      // Add custom data - check for ALL exports (not just single selection)
      console.log(`🔍 Export condition check: selectedIds.length=${selectedIds.length}, selected=${!!selected}, previewMode=${previewMode}`);
      
      // Initialize containers for custom data
      const customAddresses: any = {};
      const customLetterText: any = {};
      
      // Check each selected draft for custom data
      for (const draftId of selectedIds) {
        console.log(`🔍 Checking draft ${draftId} for custom data...`);
        
        let currentEditableData = null;
        
        // Method 1: Get from Smart Edit (if in edit mode and this is the selected draft)
        if (selected && selected.id === draftId && smartEditRef.current && previewMode === 'smart-edit') {
          currentEditableData = smartEditRef.current.getCurrentEditableData();
          console.log(`📤 Got data from SmartEditPreview for draft ${draftId}:`, currentEditableData);
        }
        
        // Method 2: Get from localStorage (always check for saved edits)
        if (!currentEditableData) {
          try {
            const saved = localStorage.getItem(`draft_addresses_${draftId}`);
            if (saved) {
              currentEditableData = JSON.parse(saved);
              console.log(`📂 Got data from localStorage for draft ${draftId}:`, currentEditableData);
            }
          } catch (e) {
            console.warn(`Failed to load from localStorage for draft ${draftId}:`, e);
          }
        }
        
        // Method 3: Use fallback editableData from Map (only for the currently selected draft)
        if (!currentEditableData && selected && selected.id === draftId) {
          currentEditableData = editableDataMap.get(draftId);
          console.log(`🔄 Using fallback editableData from Map for draft ${draftId}:`, currentEditableData);
        }
        
        // Add custom addresses if available
        if (currentEditableData) {
          customAddresses[draftId] = currentEditableData;
          console.log(`📤 Adding custom addresses for draft ${draftId}:`, currentEditableData);
        }
        
        // Add custom letter text (get from database for the draft)
        try {
          const draftRes = await fetch(`http://localhost:8000/drafts/${draftId}`);
          if (draftRes.ok) {
            const draftData = await draftRes.json();
            customLetterText[draftId] = draftData.letter_text;
            console.log(`📝 Adding custom letter text for draft ${draftId}: ${draftData.letter_text.slice(0, 100)}...`);
          }
        } catch (e) {
          console.warn(`Failed to fetch draft letter text for ${draftId}:`, e);
        }
      }
      
      // Add to request body if any custom data was found
      if (Object.keys(customAddresses).length > 0) {
        requestBody.custom_addresses = customAddresses;
        console.log(`📦 Adding custom_addresses to request:`, customAddresses);
      }
      
      if (Object.keys(customLetterText).length > 0) {
        requestBody.custom_letter_text = customLetterText;
        console.log(`📦 Adding custom_letter_text to request: ${Object.keys(customLetterText).length} entries`);
      }
      
      console.log("🚀 Sending export request:", JSON.stringify(requestBody, null, 2));
      
      const res = await fetch("http://localhost:8000/drafts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      console.log("📡 Export response status:", res.status);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const result = await res.json();
      console.log("Export result:", result);
      
      setConfettiTrigger(true);
      setSelectedIds([]);
      setShowExportModal(false);
    } catch (error) {
      console.error("Failed to export drafts:", error);
      setApiError(error instanceof Error ? error.message : "Failed to export drafts");
    } finally {
      setExportLoading(false);
    }
  }


  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">🆕 Bewerbungs-Entwürfe (NEW)</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="Filter…" value={filter} onChange={e=>setFilter(e.target.value)} className="px-2 py-1 rounded text-black" />
          <button 
            disabled={!selectedIds.length} 
            onClick={() => setShowExportModal(true)} 
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg disabled:opacity-50 transition-all font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            📄 Export PDF ({selectedIds.length})
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {apiError && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">Draft API Service nicht verfügbar</h3>
              <p className="text-sm mt-1 text-red-200">{apiError}</p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button onClick={() => loadDrafts()} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                🔄 Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-2 text-white">Lade Entwürfe...</span>
        </div>
      )}
      
      {!apiError && !isLoading && (
        <>
          {visibleDrafts.length > 0 ? (
            <table className="min-w-full text-left text-white/90">
              <thead>
                <tr><th className="px-2 py-1">Select</th><th className="px-2 py-1">ID</th><th className="px-2 py-1">Company</th><th className="px-2 py-1">Job</th><th className="px-2 py-1">Date</th><th className="px-2 py-1"></th></tr>
              </thead>
              <tbody>
                {visibleDrafts.map(d => (
                  <tr key={d.id} className="hover:bg-white/5">
                    <td className="px-2 py-1"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={()=>toggleSelect(d.id)} /></td>
                    <td className="px-2 py-1">{d.id}</td>
                    <td className="px-2 py-1">{d.company}</td>
                    <td className="px-2 py-1">{d.job_title}</td>
                    <td className="px-2 py-1">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-2 py-1 text-right"><button className="underline" onClick={() => setSelected(d)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="bg-gray-500/20 border border-gray-500 rounded-lg p-8 text-center text-white">
              <h3 className="text-xl font-semibold mb-2">Keine Entwürfe gefunden</h3>
              <p className="text-gray-300">
                {drafts.length === 0 
                  ? "Es wurden noch keine Bewerbungsentwürfe erstellt."
                  : "Keine Entwürfe entsprechen Ihrem Filter."
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* NEW IMPROVED MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ✏️ Bewerbung bearbeiten (NEU!)
                  </h3>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">#{selected.id}</span> • 
                    <span className="ml-1">{selected.job_title}</span> • 
                    <span className="ml-1 text-blue-600">{selected.company}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode('smart-edit')}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      previewMode === 'smart-edit' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✨ Smart Edit
                  </button>
                  <button
                    onClick={() => setPreviewMode('preview')}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      previewMode === 'preview' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    👁️ Vorschau
                  </button>
                  <button
                    onClick={() => {
                      setSelectedIds([selected.id]);
                      setShowExportModal(true);
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg"
                    disabled={exportLoading}
                  >
                    📄 PDF Export
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-220px)]">
              {previewMode === 'smart-edit' ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    ✨ Smart Edit - Direkt im DIN 5008 Layout bearbeiten
                  </h4>
                  <SmartEditPreview
                    ref={smartEditRef}
                    company={selected.company}
                    jobTitle={selected.job_title}
                    letterText={selected.letter_text}
                    draftId={selected.id}
                    onChange={(txt, newEditableData) => {
                      // Aktualisiere letter_text und speichere editableData DRAFT-SPECIFIC
                      console.log(`🔄 SmartEdit onChange - txt: ${txt?.slice(0,50)}..., editableData:`, newEditableData);
                      setSelected({ ...selected, letter_text: txt });
                      if (newEditableData) {
                        setEditableDataMap(prev => {
                          const newMap = new Map(prev);
                          newMap.set(selected.id, newEditableData);
                          return newMap;
                        });
                        console.log(`✅ Set editableData for draft ${selected.id} in NewDraftManager:`, newEditableData);
                      } else {
                        console.warn(`⚠️ No editableData received from SmartEdit`);
                      }
                    }}
                    className="min-h-[500px]"
                  />
                </div>
              ) : (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    👁️ DIN 5008 PDF-Vorschau (Read-Only)
                  </h4>
                  <FormattedApplicationPreview
                    company={selected.company}
                    jobTitle={selected.job_title}
                    letterText={selected.letter_text}
                    draftId={selected.id}
                    savedAddresses={editableDataMap.get(selected.id)}
                    className="min-h-[500px]"
                  />
                </div>
              )}

            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Erstellt: {new Date(selected.created_at).toLocaleDateString('de-DE')} • 
                Geändert: {new Date(selected.updated_at).toLocaleDateString('de-DE')}
              </div>
              <div className="flex gap-3 items-center">
                {saveStatus && (
                  <div className="text-sm font-medium text-green-600">
                    {saveStatus}
                  </div>
                )}
                <button 
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium" 
                  onClick={() => setSelected(null)}
                >
                  ❌ Abbrechen
                </button>
                <button 
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg" 
                  onClick={() => saveDraft(selected)}
                  disabled={saveStatus === "⏳ Speichere..."}
                >
                  {saveStatus === "⏳ Speichere..." ? "⏳ Speichere..." : "✅ Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <SimpleExportModal
          selectedDrafts={drafts.filter(d => selectedIds.includes(d.id))}
          onClose={() => setShowExportModal(false)}
          onExport={exportSelected}
          isLoading={exportLoading}
        />
      )}
      
      {/* Confetti */}
      <ConfettiSuccess trigger={confettiTrigger} onDone={() => setConfettiTrigger(false)} />
    </div>
  );
}