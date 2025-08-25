import { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import ConfettiSuccess from "./ConfettiSuccess";
import ExportModal from "./ExportModal";
import FormattedApplicationPreview from "./FormattedApplicationPreview";

type Draft = {
  id: number;
  company: string;
  job_title: string;
  letter_text: string;
  created_at: string;
  updated_at: string;
};

export default function DraftManager() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(1000); // Default to show lots of drafts
  const [hasMore, setHasMore] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

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
      
      // Check if there might be more drafts by comparing returned count with limit
      setHasMore(data.length === currentLimit);
    } catch (error) {
      console.error("Failed to load drafts:", error);
      setApiError(error instanceof Error ? error.message : "Failed to connect to Draft API");
      setDrafts([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  async function saveDraft(draft: Draft) {
    try {
      const res = await fetch(`http://localhost:8000/drafts/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_text: draft.letter_text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      loadDrafts();
    } catch (error) {
      console.error("Failed to save draft:", error);
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

  async function exportSelected(exportPath?: string) {
    if (!selectedIds.length) return;
    setExportLoading(true);
    try {
      const requestBody: any = { ids: selectedIds };
      if (exportPath) {
        requestBody.export_path = exportPath;
      }
      
      const res = await fetch("http://localhost:8000/drafts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
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
        <h2 className="text-2xl font-semibold text-white">Bewerbungs-Entwürfe</h2>
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
              <div className="mt-3 space-y-2">
                <p className="text-xs text-red-200">
                  🔧 <strong>Lösung:</strong> Der Draft API Service muss gestartet werden um gespeicherte Bewerbungsentwürfe anzuzeigen.
                </p>
                <div className="bg-black/30 p-2 rounded text-xs">
                  <p className="text-green-300">📝 Einfache Lösung - In einem neuen Terminal:</p>
                  <code className="text-yellow-300">python start_draft_api.py</code>
                </div>
                <div className="bg-black/30 p-2 rounded text-xs">
                  <p className="text-green-300">⚙️ Manuell - In einem neuen Terminal:</p>
                  <code className="text-yellow-300">python draft_api.py</code>
                </div>
              </div>
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
                  ? "Es wurden noch keine Bewerbungsentwürfe erstellt. Generieren Sie Bewerbungen über die Jobsuche, um sie hier zu bearbeiten."
                  : "Keine Entwürfe entsprechen Ihrem Filter."
                }
              </p>
              {drafts.length === 0 && (
                <button onClick={() => loadDrafts()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Aktualisieren
                </button>
              )}
            </div>
          )}
          
          {/* Status Panel */}
          {drafts.length > 0 && (
            <div className="mt-4 bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-blue-200">
                  📊 <strong>{drafts.length}</strong> Entwürfe geladen 
                  {visibleDrafts.length !== drafts.length && (
                    <span className="text-blue-300"> • <strong>{visibleDrafts.length}</strong> nach Filter</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {hasMore && (
                    <button
                      onClick={() => {
                        const newLimit = limit + 500;
                        setLimit(newLimit);
                        loadDrafts(newLimit);
                      }}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors text-sm"
                      disabled={isLoading}
                    >
                      {isLoading ? '...' : '📥 Mehr laden (+500)'}
                    </button>
                  )}
                  <button
                    onClick={() => loadDrafts()}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition-colors text-sm"
                    disabled={isLoading}
                  >
                    🔄 Aktualisieren
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ✏️ Bewerbung bearbeiten
                  </h3>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">#{selected.id}</span> • 
                    <span className="ml-1">{selected.job_title}</span> • 
                    <span className="ml-1 text-blue-600">{selected.company}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode('edit')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      previewMode === 'edit' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✏️ Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      console.log("Switching to preview mode", selected);
                      setPreviewMode('preview');
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      previewMode === 'preview' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    👁️ Vorschau
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-220px)]">
              {previewMode === 'edit' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Bewerbungstext (DIN 5008 Format)
                  </label>
                  <RichTextEditor 
                    value={selected.letter_text} 
                    onChange={txt => setSelected({ ...selected, letter_text: txt })}
                    className="min-h-[500px]"
                  />
                </div>
              ) : (
                <FormattedApplicationPreview
                  company={selected.company}
                  jobTitle={selected.job_title}
                  letterText={selected.letter_text}
                  className="min-h-[500px]"
                />
              )}
              
              {previewMode === 'edit' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <div>
                      <strong>Formatierungs-Tipps:</strong>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Verwenden Sie <strong>Fett</strong> für wichtige Begriffe</li>
                        <li>• Verwenden Sie <em>Kursiv</em> für Betonungen</li>
                        <li>• Listen für Qualifikationen oder Erfahrungen</li>
                        <li>• H2 für Abschnittsüberschriften</li>
                        <li>• Klicken Sie auf "👁️ Vorschau" um das PDF-Layout zu sehen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Erstellt: {new Date(selected.created_at).toLocaleDateString('de-DE')} • 
                Geändert: {new Date(selected.updated_at).toLocaleDateString('de-DE')}
              </div>
              <div className="flex gap-3">
                <button 
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium" 
                  onClick={() => setSelected(null)}
                >
                  ❌ Abbrechen
                </button>
                <button 
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg" 
                  onClick={() => { saveDraft(selected); setSelected(null); }}
                >
                  ✅ Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
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