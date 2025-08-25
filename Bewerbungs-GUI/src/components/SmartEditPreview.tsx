import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface PersonalData {
  name: string;
  street: string;
  city: string;
  phone: string;
  email: string;
}

interface SmartEditPreviewProps {
  company: string;
  jobTitle: string;
  letterText: string;
  onChange: (newText: string, editableData?: EditableApplicationData) => void;
  className?: string;
  draftId?: number; // Für localStorage-Key
}

export interface SmartEditPreviewRef {
  getCurrentEditableData: () => EditableApplicationData;
}

interface EditableApplicationData {
  personalData: PersonalData;
  companyAddress: string;
  currentDate: string;
  betreff: string;
  content: string;
}

const SmartEditPreview = forwardRef<SmartEditPreviewRef, SmartEditPreviewProps>(({ 
  company, 
  jobTitle, 
  letterText, 
  onChange,
  className = "",
  draftId
}, ref) => {
  // Single state für alle editierbaren Daten
  const [editableData, setEditableData] = useState<EditableApplicationData>({
    personalData: {
      name: "Max Mustermann",
      street: "Maastrichter Str. 13", 
      city: "12345 Musterstadt",
      phone: "Tel.:017684418837",
      email: "max.mustermann@example.com"
    },
    companyAddress: "",
    currentDate: "",
    betreff: "",
    content: ""
  });
  
  // Flag um zu tracken ob Daten schon initial geladen wurden
  const [isInitiallyLoaded, setIsInitiallyLoaded] = useState<boolean>(false);
  
  // Refs für ContentEditable Adressfelder
  const nameRef = useRef<HTMLDivElement>(null);
  const streetRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const companyAddressRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  
  // Refs für Input/Textarea Felder
  const betreffRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Expose current editable data to parent component
  useImperativeHandle(ref, () => ({
    getCurrentEditableData: () => editableData
  }));

  // Hilfsfunktion zum Speichern und Wiederherstellen der Cursor-Position für ContentEditable
  const saveCursorPosition = (element: HTMLElement | null) => {
    if (!element) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer
    };
  };

  const restoreCursorPosition = (element: HTMLElement | null, position: any) => {
    if (!element || !position) return;
    
    try {
      const range = document.createRange();
      range.setStart(position.startContainer, position.startOffset);
      range.setEnd(position.endContainer, position.endOffset);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      // Fallback: Cursor am Ende setzen
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };


  // EINMALIGE Daten-Initialisierung - lädt NUR einmal beim Mount
  useEffect(() => {
    if (isInitiallyLoaded) return; // Verhindert mehrfaches Laden
    
    const initializeAllData = async () => {
      try {
        // 0. Prüfe ob gespeicherte Adressen für diesen Draft existieren
        let savedAddresses = null;
        if (draftId) {
          const saved = localStorage.getItem(`draft_addresses_${draftId}`);
          if (saved) {
            try {
              savedAddresses = JSON.parse(saved);
              console.log(`📂 Loaded saved addresses for draft ${draftId}:`, savedAddresses);
            } catch (e) {
              console.warn("Failed to parse saved addresses:", e);
            }
          }
        }

        // 1. Personal Data laden (API oder aus gespeicherten Daten)
        let personalDataLoaded = editableData.personalData;
        
        if (savedAddresses?.personalData) {
          // Verwende gespeicherte persönliche Daten
          personalDataLoaded = savedAddresses.personalData;
        } else {
          // Lade aus API
          try {
            let response = await fetch('http://localhost:5001/api/settings/personal');
            if (!response.ok) {
              response = await fetch('http://localhost:5001/api/profile/active');
            }
            
            if (response.ok) {
              const data = await response.json();
              personalDataLoaded = {
                name: data.name || data.full_name || personalDataLoaded.name,
                street: data.address || data.street || personalDataLoaded.street,
                city: data.city || data.city_zip || personalDataLoaded.city,
                phone: data.phone || personalDataLoaded.phone,
                email: data.email || personalDataLoaded.email
              };
            }
          } catch (error) {
            console.log("Personal data fallback - using defaults");
          }
        }

        // 2. Company Address (gespeichert oder initial)
        const companyAddr = savedAddresses?.companyAddress || 
          `${company}\n\n[Adresse wird wie beim PDF-Export ermittelt]\n\nKlicken zum Bearbeiten`;
        
        // 3. Current Date (gespeichert oder aktuell)
        const currentDate = savedAddresses?.currentDate || 
          new Date().toLocaleDateString('de-DE');
        
        // 4. Parse Letter Text für Betreff/Content (gespeichert oder geparsed)
        let foundBetreff = savedAddresses?.betreff || "";
        let foundContent = savedAddresses?.content || "";
        
        if (!foundBetreff) {
          // Parse aus letterText
          const lines = letterText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().startsWith('betreff:')) {
              foundBetreff = line.substring(8).trim();
              foundContent = lines.slice(i + 1).join('\n').trim();
              break;
            }
          }
          
          if (!foundBetreff) {
            foundBetreff = `Bewerbung als ${jobTitle}`;
            foundContent = letterText;
          }
        }

        // 5. Setze alle Daten auf einmal
        const finalData = {
          personalData: personalDataLoaded,
          companyAddress: companyAddr,
          currentDate: currentDate,
          betreff: foundBetreff,
          content: foundContent
        };
        
        setEditableData(finalData);
        setIsInitiallyLoaded(true);
        
        // IMMER an Parent weiterleiten - sowohl bei gespeicherten als auch neuen Daten
        const newText = `Betreff: ${foundBetreff}\n\n${foundContent}`;
        console.log(`🎯 Initial data loaded - sending to parent:`, finalData);
        onChange(newText, finalData);
        
      } catch (error) {
        console.error("Fehler beim Initialisieren der Daten:", error);
        setIsInitiallyLoaded(true); // Auch bei Fehler als "geladen" markieren
      }
    };

    initializeAllData();
  }, [letterText, jobTitle, company, draftId, isInitiallyLoaded]);


  // Update parent component when content changes
  const updateParent = () => {
    const newText = `Betreff: ${editableData.betreff}\n\n${editableData.content}`;
    console.log(`🚀 SmartEdit updateParent called - sending editableData:`, editableData);
    onChange(newText, editableData);
  };

  // Debounced updateParent für bessere Performance
  const debouncedUpdateParent = useRef<number | null>(null);
  
  const triggerParentUpdate = () => {
    if (debouncedUpdateParent.current) {
      clearTimeout(debouncedUpdateParent.current);
    }
    debouncedUpdateParent.current = setTimeout(() => {
      updateParent();
    }, 300); // Längere Debounce für weniger Updates
  };

  // SIMPLE Handler für Betreff Input
  const handleBetreffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedData = { ...editableData, betreff: e.target.value };
    setEditableData(updatedData);
    // Sofort an Parent senden
    const newText = `Betreff: ${updatedData.betreff}\n\n${updatedData.content}`;
    onChange(newText, updatedData);
  };

  // SIMPLE Handler für Content Textarea  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedData = { ...editableData, content: e.target.value };
    setEditableData(updatedData);
    // Sofort an Parent senden
    const newText = `Betreff: ${updatedData.betreff}\n\n${updatedData.content}`;
    onChange(newText, updatedData);
  };

  // Parent Update nur bei onBlur (wenn User fertig ist)
  const handleBetreffBlur = () => {
    triggerParentUpdate();
  };

  const handleContentBlur = () => {
    triggerParentUpdate();
  };

  const handleBetreffKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus zur Content-Textarea verschieben
      if (contentRef.current) {
        contentRef.current.focus();
      }
    }
  };

  // Generische Handler-Funktion für Adressfelder (mit editableData)
  const createInputHandler = (
    ref: React.RefObject<HTMLDivElement>,
    field: keyof EditableApplicationData | keyof PersonalData
  ) => {
    return (e: React.FormEvent<HTMLDivElement>) => {
      const position = saveCursorPosition(ref.current);
      const newValue = e.currentTarget.textContent || "";
      
      // Update entsprechendes Feld in editableData
      let updatedData;
      if (field === 'companyAddress' || field === 'currentDate') {
        updatedData = { ...editableData, [field]: newValue };
      } else {
        // Personal data fields
        updatedData = { 
          ...editableData, 
          personalData: { ...editableData.personalData, [field]: newValue }
        };
      }
      
      setEditableData(updatedData);
      
      // SOFORT an Parent senden (für Live-Updates)
      const newText = `Betreff: ${updatedData.betreff}\n\n${updatedData.content}`;
      console.log(`📍 Address field '${field}' changed - sending update:`, updatedData);
      onChange(newText, updatedData);
      
      // Cursor-Position nach State-Update wiederherstellen
      requestAnimationFrame(() => {
        restoreCursorPosition(ref.current, position);
      });
    };
  };

  // Handler für die einzelnen Adressfelder
  const handleNameChange = createInputHandler(nameRef, 'name');
  const handleStreetChange = createInputHandler(streetRef, 'street');
  const handleCityChange = createInputHandler(cityRef, 'city');
  const handlePhoneChange = createInputHandler(phoneRef, 'phone');
  const handleEmailChange = createInputHandler(emailRef, 'email');
  const handleCompanyAddressChange = createInputHandler(companyAddressRef, 'companyAddress');
  const handleDateChange = createInputHandler(dateRef, 'currentDate');


  // currentDate wird jetzt über useState verwaltet

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${className}`}>
      {/* Editing Instructions */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-blue-500">✏️</span>
          <div className="text-sm text-blue-800">
            <strong>Smart Edit Mode:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Klicken Sie direkt in den Betreff oder Text um zu bearbeiten</li>
              <li>• Das Layout zeigt sofort wie das PDF aussehen wird</li>
              <li>• Enter im Betreff springt zum Haupttext</li>
              <li>• Änderungen werden automatisch gespeichert</li>
            </ul>
          </div>
        </div>
      </div>

      {/* DIN 5008 Layout */}
      <div className="max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.2' }}>
        
        {/* Header mit Absender (rechts) - EDITIERBAR */}
        <div className="flex justify-end mb-8">
          <div className="text-right text-sm text-gray-700">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">Editierbar:</span>
              <span className="text-xs text-gray-500">Ihre Adresse (klicken zum Bearbeiten)</span>
            </div>
            <div className="bg-blue-50 p-3 rounded border-2 border-dashed border-blue-300 hover:border-blue-500 focus-within:border-blue-600 transition-colors">
              <div 
                ref={nameRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleNameChange}
                className="font-medium cursor-text outline-none hover:bg-blue-100 focus:bg-blue-100 p-1 rounded transition-colors"
              >
                {editableData.personalData.name}
              </div>
              <div 
                ref={streetRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleStreetChange}
                className="cursor-text outline-none hover:bg-blue-100 focus:bg-blue-100 p-1 rounded transition-colors"
              >
                {editableData.personalData.street}
              </div>
              <div 
                ref={cityRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleCityChange}
                className="cursor-text outline-none hover:bg-blue-100 focus:bg-blue-100 p-1 rounded transition-colors"
              >
                {editableData.personalData.city}
              </div>
              <div 
                ref={phoneRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handlePhoneChange}
                className="cursor-text outline-none hover:bg-blue-100 focus:bg-blue-100 p-1 rounded transition-colors"
              >
                {editableData.personalData.phone}
              </div>
              <div 
                ref={emailRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleEmailChange}
                className="cursor-text outline-none hover:bg-blue-100 focus:bg-blue-100 p-1 rounded transition-colors"
              >
                {editableData.personalData.email}
              </div>
            </div>
          </div>
        </div>

        {/* Empfängeradresse (links) - EDITIERBAR */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">Editierbar:</span>
            <span className="text-xs text-gray-500">Firmenadresse (klicken zum Bearbeiten)</span>
          </div>
          <div 
            ref={companyAddressRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handleCompanyAddressChange}
            className="text-sm text-gray-700 whitespace-pre-line bg-green-50 p-3 rounded border-2 border-dashed border-green-300 hover:border-green-500 focus:border-green-600 cursor-text outline-none hover:bg-green-100 focus:bg-green-100 transition-colors"
            style={{ minHeight: '4em' }}
          >
            {editableData.companyAddress}
          </div>
        </div>

        {/* Datum (rechts) - EDITIERBAR */}
        <div className="flex justify-end mb-8">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">Editierbar:</span>
              <span className="text-xs text-gray-500">Datum (klicken zum Bearbeiten)</span>
            </div>
            <div 
              ref={dateRef}
              contentEditable
              suppressContentEditableWarning={true}
              onInput={handleDateChange}
              className="text-sm text-gray-700 bg-purple-50 p-2 rounded border-2 border-dashed border-purple-300 hover:border-purple-500 focus:border-purple-600 cursor-text outline-none hover:bg-purple-100 focus:bg-purple-100 transition-colors"
              style={{ minWidth: '80px' }}
            >
              {editableData.currentDate}
            </div>
          </div>
        </div>

        {/* Editierbarer Betreff */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">Editierbar:</span>
            <span className="text-xs text-gray-500">Betreff bearbeiten</span>
          </div>
          <input
            ref={betreffRef}
            type="text"
            value={editableData.betreff}
            onChange={handleBetreffChange}
            onBlur={handleBetreffBlur}
            onKeyDown={handleBetreffKeyDown}
            className="w-full font-bold text-gray-900 p-2 border-2 border-yellow-300 rounded hover:border-yellow-500 focus:border-yellow-600 focus:outline-none bg-yellow-50 hover:bg-yellow-100 focus:bg-yellow-100 transition-colors"
            placeholder="Betreff eingeben..."
          />
        </div>

        {/* Editierbarer Anschreiben Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">Editierbar:</span>
            <span className="text-xs text-gray-500">Anschreiben bearbeiten</span>
          </div>
          <textarea
            ref={contentRef}
            value={editableData.content}
            onChange={handleContentChange}
            onBlur={handleContentBlur}
            className="w-full text-gray-800 leading-relaxed p-4 border-2 border-green-300 rounded hover:border-green-500 focus:border-green-600 focus:outline-none bg-green-50 hover:bg-green-100 focus:bg-green-100 transition-colors resize-none"
            style={{ minHeight: '300px', whiteSpace: 'pre-wrap' }}
            placeholder="Anschreiben Text eingeben..."
          />
        </div>
      </div>

      {/* Info-Box */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500">🎯</span>
            <div className="text-sm text-green-800">
              <strong>Live-Vorschau aktiv:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Layout entspricht exakt dem späteren PDF</li>
                <li>• Adressen werden bei PDF-Export automatisch ermittelt</li>
                <li>• Formatierung folgt DIN 5008 Standard</li>
                <li>• Änderungen werden sofort sichtbar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SmartEditPreview.displayName = 'SmartEditPreview';
export default SmartEditPreview;