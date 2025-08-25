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

interface SimpleExportModalProps {
  selectedDrafts: Draft[];
  onClose: () => void;
  onExport: (exportPath?: string, customFilename?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function SimpleExportModal({ 
  selectedDrafts, 
  onClose, 
  onExport, 
  isLoading = false 
}: SimpleExportModalProps) {
  // Default export path - same location as applications
  const [exportPath, setExportPath] = useState<string>("/path/to/applications");
  
  // Generate default filename
  const generateDefaultFilename = () => {
    if (selectedDrafts.length === 1) {
      const draft = selectedDrafts[0];
      const safeCompany = draft.company.replace(/[^a-zA-Z0-9äöüÄÖÜ\s]/g, '').trim().replace(/\s+/g, '_');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `Bewerbung_${safeCompany}_${date}.pdf`;
    } else {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `Bewerbungen_${selectedDrafts.length}x_${date}.pdf`;
    }
  };

  const [filename, setFilename] = useState<string>(generateDefaultFilename());

  const handleExport = async () => {
    // Send directory path and custom filename
    await onExport(exportPath || undefined, filename.trim() || undefined);
  };

  const getExportDescription = () => {
    if (selectedDrafts.length === 1) {
      const draft = selectedDrafts[0];
      return `Draft ${draft.id} - ${draft.company}`;
    }
    return `${selectedDrafts.length} Bewerbungen`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📄 PDF Export
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Schließen"
            >
              ❌
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          

          {/* Export Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speicherpfad:
            </label>
            <PathSelector
              onPathChange={setExportPath}
              defaultPath={exportPath}
              label="Export-Pfad wählen"
            />
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dateiname:
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dateiname eingeben..."
            />
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading || !filename.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exportiere...
              </>
            ) : (
              <>
                📄 PDF Exportieren
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}