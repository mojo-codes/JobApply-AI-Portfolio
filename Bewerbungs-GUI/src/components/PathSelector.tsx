import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";

interface PathSelectorProps {
  onPathChange: (path: string) => void;
  defaultPath?: string;
  label?: string;
  className?: string;
}

export default function PathSelector({ 
  onPathChange, 
  defaultPath = "", 
  label = "Export-Pfad wählen",
  className = ""
}: PathSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<string>(defaultPath);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPath = async () => {
    setIsLoading(true);
    try {
      // Use Tauri's dialog API to select a directory
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: selectedPath || undefined,
        title: "Export-Ordner wählen"
      });

      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
        onPathChange(selected);
      }
    } catch (error) {
      console.error("Fehler beim Öffnen des Dateiauswahl-Dialogs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = () => {
    // Reset to default applications directory
    const defaultDir = "/path/to/applications";
    setSelectedPath(defaultDir);
    onPathChange(defaultDir);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        📁 {label}
      </label>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 min-h-[2.5rem] flex items-center">
          {selectedPath ? (
            <span className="truncate" title={selectedPath}>
              {selectedPath}
            </span>
          ) : (
            <span className="text-gray-500 italic">
              Kein Pfad ausgewählt - Standard wird verwendet
            </span>
          )}
        </div>
        
        <button
          onClick={handleSelectPath}
          disabled={isLoading}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Öffne...
            </>
          ) : (
            <>
              📂 Durchsuchen
            </>
          )}
        </button>
        
        <button
          onClick={resetToDefault}
          className="px-3 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
          title="Standard-Pfad wiederherstellen"
        >
          🔄
        </button>
      </div>
      
    </div>
  );
}