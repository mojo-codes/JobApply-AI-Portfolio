import { useEffect, useState } from "react";

const TIPS = [
  "💡 Tipp: Verwende Schlüsselwörter aus der Stellenanzeige im Anschreiben.",
  "⚡ Fun Fact: Die meisten Recruiter scannen CVs nur 7 Sekunden lang!",
  "📄 Tipp: Halte dein Anschreiben kürzer als eine DIN-A4 Seite.",
  "🎯 Tipp: Personalisierte Anschreiben erhöhen die Rücklaufquote um 50%.",
  "🔍 Tipp: Recherchiere das Unternehmen vor der Bewerbung gründlich.",
  "📧 Tipp: Verwende eine professionelle E-Mail-Adresse für Bewerbungen.",
  "⏰ Fun Fact: Bewerbungen am Dienstag haben die höchste Öffnungsrate!",
  "📱 Tipp: Optimiere deinen LinkedIn-Profiltext für Recruiter.",
  "🎨 Tipp: Ein sauberes, übersichtliches Layout wirkt professioneller.",
  "🤝 Tipp: Vermeide Standardfloskeln - sei authentisch und spezifisch.",
  "📈 Fun Fact: Bewerbungen mit Zahlen und Erfolgen stechen hervor.",
  "🎪 Tipp: Zeige deine Soft Skills durch konkrete Beispiele auf.",
  "🌟 Fun Fact: 85% aller Jobs werden durch Networking vergeben!",
  "📝 Tipp: Prüfe deine Bewerbung mehrmals auf Rechtschreibfehler.",
  "🚀 Tipp: Erwähne relevante Projekte und Erfolge aus der Vergangenheit.",
];

export function useLoadingTips(intervalMs = 5000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % TIPS.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return TIPS[index];
} 