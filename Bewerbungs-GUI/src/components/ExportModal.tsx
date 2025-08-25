import { useState } from "react";
import PathSelector from "./PathSelector";

interface Draft {
  id: number;
  company: string;
  job_title: string;
  letter_text: string;
  created_at: string;
  updated_at: string;
}

interface ExportModalProps {
  selectedDrafts: Draft[];
  onClose: () => void;
  onExport: (exportPath?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ExportModal({ 
  selectedDrafts, 
  onClose, 
  onExport, 
  isLoading = false 
}: ExportModalProps) {
  const [exportPath, setExportPath] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const handleExport = async () => {
    await onExport(exportPath || undefined);
  };

  const previewDraft = selectedDrafts[0]; // Show preview of first draft

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-white/98 backdrop-blur-xl w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-3xl shadow-2xl border border-white/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 p-8 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                📄 PDF Export Konfiguration
              </h2>
              <p className="text-gray-600">
                {selectedDrafts.length} Bewerbung{selectedDrafts.length !== 1 ? 'en' : ''} für Export ausgewählt
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                DIN 5008 Standard
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Schließen"
              >
                ❌
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(95vh-280px)]">
          {/* Selected Drafts Overview */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Ausgewählte Bewerbungen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDrafts.map((draft) => (
                <div key={draft.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {draft.company}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {draft.job_title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        ID: {draft.id} • {new Date(draft.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      👁️ Vorschau
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Path Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📁 Export-Ziel wählen
            </h3>
            <PathSelector 
              onPathChange={setExportPath}
              label="Ordner für PDF-Export"
            />
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Standard-Verhalten:</strong> Falls kein Pfad gewählt wird, werden die PDFs in einem 
                automatisch erstellten Ordner <code className="bg-gray-200 px-1 rounded">applications/Draft_Export_[Datum]/</code> gespeichert.
              </p>
            </div>
          </div>
          
          {/* Layout Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              👁️ PDF Layout-Vorschau (DIN 5008)
            </h3>
            
            {/* Preview Content */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="space-y-4 text-sm">
                {/* Mock PDF Layout */}
                <div className="flex justify-between items-start">
                  <div className="text-gray-600">
                    <strong>Layout-Struktur:</strong>
                  </div>
                  <div className="text-right text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Absender (rechts oben)
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="bg-blue-100 p-3 rounded text-xs">
                      <div className="font-medium text-blue-800">🏢 Empfänger-Adresse</div>
                      <div className="text-blue-600 mt-1">
                        Automatische Firmenerkennung<br />
                        Google Places API<br />
                        Fallback auf Firmennamen
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="bg-green-100 p-3 rounded text-xs">
                      <div className="font-medium text-green-800">📅 Datum</div>
                      <div className="text-green-600 mt-1">
                        {new Date().toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-100 p-3 rounded text-xs">
                  <div className="font-medium text-yellow-800">📧 Betreff</div>
                  <div className="text-yellow-600 mt-1">
                    "Bewerbung als [Position]"
                  </div>
                </div>
                
                <div className="bg-gray-100 p-3 rounded text-xs">
                  <div className="font-medium text-gray-800">📝 Anschreiben-Text</div>
                  <div className="text-gray-600 mt-1">
                    Professionelle Formatierung mit korrekten Zeilenabständen
                  </div>
                </div>
              </div>
              
              {showPreview && previewDraft && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Beispiel: {previewDraft.company} - {previewDraft.job_title}
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto text-xs">
                    <div className="whitespace-pre-wrap">
                      {previewDraft.letter_text.substring(0, 300)}
                      {previewDraft.letter_text.length > 300 && "..."}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>DIN 5008 konform</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Automatische Adresserkennung</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Professionelle Formatierung</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50/80 px-8 py-6 border-t border-gray-200/50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>📄 PDFs werden im DIN 5008 Standard erstellt</span>
              <span>•</span>
              <span>⚡ Automatische Firmenadress-Suche</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-medium"
              onClick={onClose}
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Erstelle PDFs...
                </>
              ) : (
                <>
                  🚀 Export starten ({selectedDrafts.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}