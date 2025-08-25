import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddressSuggestion {
  description: string;
  place_id: string;
  terms: { offset: number; value: string; }[];
  types: string[];
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onGeolocationRequest?: () => void;
  isPrefilled?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Adresse eingeben...",
  className = "",
  disabled = false,
  onGeolocationRequest,
  isPrefilled = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Debounced search function
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await fetchSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const fetchSuggestions = async (input: string) => {
    if (!input || input.length < 3) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/autocomplete-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          // API returned error, disable autocomplete gracefully
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        // API not available, disable autocomplete gracefully
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      // Network error, disable autocomplete gracefully
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const requestGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch('http://localhost:5002/api/reverse-geocode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ latitude, longitude })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.formatted_address) {
                onChange(data.formatted_address);
              } else {
                // API returned error, inform user
                alert('Reverse-Geocoding nicht verfügbar. Bitte geben Sie Ihre Adresse manuell ein.');
              }
            } else {
              // API not available, inform user
              alert('Reverse-Geocoding nicht verfügbar. Bitte geben Sie Ihre Adresse manuell ein.');
            }
          } catch (error) {
            // Network error, inform user
            alert('Reverse-Geocoding nicht verfügbar. Bitte geben Sie Ihre Adresse manuell ein.');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Standortbestimmung fehlgeschlagen. Bitte geben Sie Ihre Adresse manuell ein.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      alert('Geolocation wird von diesem Browser nicht unterstützt.');
    }
    
    onGeolocationRequest?.();
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder=""
          rows={3}
          style={{ resize: 'vertical' }}
          disabled={disabled}
          className={`
            w-full pr-20 pl-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white 
            placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
        />
        
        {/* Geolocation Button */}
        <button
          type="button"
          onClick={requestGeolocation}
          disabled={disabled}
          className="absolute right-2 p-2 text-white/70 hover:text-white hover:bg-white/10 
                     rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Standort automatisch bestimmen"
        >
          📍
        </button>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-10 p-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-slate-800/95 backdrop-blur-md border border-white/20 
                       rounded-xl shadow-2xl max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.place_id}
                ref={el => suggestionRefs.current[index] = el}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  px-4 py-3 cursor-pointer transition-all duration-150 border-b border-white/10 last:border-b-0
                  ${selectedIndex === index 
                    ? 'bg-blue-500/30 text-white' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 mt-0.5">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {suggestion.description}
                    </div>
                    {suggestion.terms.length > 1 && (
                      <div className="text-xs text-white/50 mt-1 truncate">
                        {suggestion.terms.slice(1).map(term => term.value).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No suggestions message - Only show if user is actively typing and no address is pre-filled */}
      {!isLoading && showSuggestions && suggestions.length === 0 && value.length >= 3 && !value.includes('\n') && value.length < 50 && !isPrefilled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-50 w-full mt-2 bg-slate-800/95 backdrop-blur-md border border-white/20 
                     rounded-xl shadow-2xl p-4 text-center text-white/60"
        >
          <span className="text-yellow-400">⚠️</span>
          <p className="text-sm mt-1">
            Keine Adressvorschläge gefunden. 
            <br />
            <span className="text-xs text-white/40">
              Überprüfen Sie Ihre Eingabe oder versuchen Sie es mit einer anderen Formulierung.
            </span>
          </p>
        </motion.div>
      )}
      
      {/* Persistent Format Hint - Always visible below input */}
      <div className="mt-1 text-xs text-white/40 select-none">
        💡 {placeholder}
      </div>
    </div>
  );
};

export default AddressAutocomplete; 