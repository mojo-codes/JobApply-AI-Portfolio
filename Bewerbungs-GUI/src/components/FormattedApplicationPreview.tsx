import { useState, useEffect } from "react";

interface PersonalData {
  name: string;
  street: string;
  city: string;
  phone: string;
  email: string;
}

interface FormattedApplicationPreviewProps {
  company: string;
  jobTitle: string;
  letterText: string;
  className?: string;
  draftId?: number;
  savedAddresses?: any;
}

export default function FormattedApplicationPreview({ 
  company, 
  jobTitle, 
  letterText, 
  className = "",
  draftId,
  savedAddresses
}: FormattedApplicationPreviewProps) {
  const [personalData, setPersonalData] = useState<PersonalData>({
    name: "Max Mustermann",
    street: "Maastrichter Str. 13", 
    city: "12345 Musterstadt",
    phone: "Tel.:017684418837",
    email: "max.mustermann@example.com"
  });
  const [companyAddress, setCompanyAddress] = useState<string>("");

  // Lade persönliche Daten - priorisiere gespeicherte Adressen
  useEffect(() => {
    const loadPersonalData = async () => {
      // 1. Fallback-Daten
      let fallbackData = {
        name: "Max Mustermann",
        street: "Maastrichter Str. 13", 
        city: "12345 Musterstadt",
        phone: "Tel.:017684418837",
        email: "max.mustermann@example.com"
      };
      
      // 2. Prüfe gespeicherte Adressen (höchste Priorität)
      if (savedAddresses?.personalData) {
        console.log(`📂 FormattedPreview: Using saved personal data for draft ${draftId}`);
        setPersonalData(savedAddresses.personalData);
        return; // Nutze gespeicherte Daten und überspringe API
      }
      
      // 3. Prüfe localStorage (falls savedAddresses nicht verfügbar)
      if (draftId) {
        const saved = localStorage.getItem(`draft_addresses_${draftId}`);
        if (saved) {
          try {
            const savedData = JSON.parse(saved);
            if (savedData.personalData) {
              console.log(`📂 FormattedPreview: Using localStorage personal data for draft ${draftId}`);
              setPersonalData(savedData.personalData);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse saved addresses in preview:", e);
          }
        }
      }
      
      // 4. Fallback zu API (nur wenn keine gespeicherten Daten)
      setPersonalData(fallbackData);
      
      try {
        let response = await fetch('http://localhost:5001/api/settings/personal');
        if (!response.ok) {
          response = await fetch('http://localhost:5001/api/profile/active');
        }
        
        if (response.ok) {
          const data = await response.json();
          setPersonalData({
            name: data.name || data.full_name || fallbackData.name,
            street: data.address || data.street || fallbackData.street,
            city: data.city || data.city_zip || fallbackData.city,
            phone: data.phone || fallbackData.phone,
            email: data.email || fallbackData.email
          });
        }
      } catch (error) {
        console.error("Fehler beim Laden der persönlichen Daten (using fallback):", error);
      }
    };

    loadPersonalData();
  }, [draftId, savedAddresses]);

  // Lade Firmenadresse - priorisiere gespeicherte Adressen
  useEffect(() => {
    // 1. Prüfe gespeicherte Company Address (höchste Priorität)
    if (savedAddresses?.companyAddress) {
      console.log(`📂 FormattedPreview: Using saved company address for draft ${draftId}`);
      setCompanyAddress(savedAddresses.companyAddress);
      return;
    }
    
    // 2. Prüfe localStorage (falls savedAddresses nicht verfügbar)
    if (draftId) {
      const saved = localStorage.getItem(`draft_addresses_${draftId}`);
      if (saved) {
        try {
          const savedData = JSON.parse(saved);
          if (savedData.companyAddress) {
            console.log(`📂 FormattedPreview: Using localStorage company address for draft ${draftId}`);
            setCompanyAddress(savedData.companyAddress);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse saved company address in preview:", e);
        }
      }
    }
    
    // 3. Fallback - Standard-Adresse
    setCompanyAddress(`${company}\nAdresse wird automatisch ermittelt\nBei PDF-Export`);
  }, [company, draftId, savedAddresses]);

  // Parse den Bewerbungstext um Betreff zu extrahieren
  const parseLetterText = (text: string) => {
    const lines = text.split('\n');
    let betreff = "";
    let content = "";
    
    // Suche nach Betreff-Zeile
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().startsWith('betreff:')) {
        betreff = line.substring(8).trim(); // Remove "Betreff: "
        content = lines.slice(i + 1).join('\n').trim();
        break;
      }
    }
    
    if (!betreff) {
      betreff = `Bewerbung als ${jobTitle}`;
      content = text;
    }
    
    return { betreff, content };
  };

  const { betreff, content } = parseLetterText(letterText);
  
  // Use custom date from savedAddresses or default to current date
  const currentDate = savedAddresses?.currentDate || new Date().toLocaleDateString('de-DE');

  // personalData ist jetzt immer gesetzt (Fallback), kein Loading-State nötig

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${className}`}>
      {/* DIN 5008 Layout */}
      <div className="max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.2' }}>
        
        {/* Header mit Absender (rechts) */}
        <div className="flex justify-end mb-8">
          <div className="text-right text-sm text-gray-700">
            <div className="font-medium">{personalData.name}</div>
            <div>{personalData.street}</div>
            <div>{personalData.city}</div>
            <div>{personalData.phone}</div>
            <div>{personalData.email}</div>
          </div>
        </div>

        {/* Empfängeradresse (links) */}
        <div className="mb-6">
          <div className="text-sm text-gray-700 whitespace-pre-line">
            {companyAddress}
          </div>
        </div>

        {/* Datum (rechts) */}
        <div className="flex justify-end mb-8">
          <div className="text-sm text-gray-700">
            {currentDate}
          </div>
        </div>

        {/* Betreff */}
        <div className="mb-6">
          <div className="font-bold text-gray-900">
            {betreff}
          </div>
        </div>

        {/* Anschreiben Content */}
        <div className="space-y-4 text-gray-800 leading-relaxed">
          {content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-justify">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </div>

      {/* Info-Box */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-500">💡</span>
            <div className="text-sm text-blue-800">
              <strong>PDF-Export Vorschau:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Absender-Adresse wird automatisch rechtsbündig platziert</li>
                <li>• Firmenadresse wird über Google Places API ermittelt</li>
                <li>• Layout folgt DIN 5008 Standard für Geschäftsbriefe</li>
                <li>• Professionelle Formatierung mit korrekten Abständen</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}