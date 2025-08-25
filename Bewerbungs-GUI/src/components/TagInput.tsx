import React, { useState, useRef, KeyboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ 
  tags, 
  onChange, 
  placeholder = "Enter keywords...", 
  className = "",
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sanitizeInput = (value: string): string => {
    // Remove potentially dangerous characters and excessive whitespace
    return value
      .replace(/[<>\"']/g, '') // Remove HTML/script injection characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const validateTag = (tag: string): boolean => {
    // Validate tag constraints
    const sanitized = sanitizeInput(tag);
    return (
      sanitized.length > 0 && 
      sanitized.length <= 50 && // Max 50 characters per tag
      /^[a-zA-Z0-9\-_.äöüÄÖÜß\s]+$/.test(sanitized) // Allow alphanumeric, hyphens, dots, underscores, umlauts, spaces
    );
  };

  const parseInput = (value: string): string[] => {
    // Split by both commas and spaces, clean up and validate
    return value
      .split(/[,\s]+/)
      .map(tag => sanitizeInput(tag))
      .filter(tag => validateTag(tag))
      .slice(0, 20); // Max 20 tags
  };

  const addTags = (newTags: string[]) => {
    // Filter and limit total number of tags
    const allTags = [...tags, ...newTags];
    const uniqueTags = [...new Set(allTags)].slice(0, 20); // Enforce max 20 tags total
    onChange(uniqueTags);
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  const handleInputChange = (value: string) => {
    // Apply real-time sanitization to input
    const sanitized = sanitizeInput(value);
    setInputValue(sanitized);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Prevent adding tags if we've reached the limit
    if (tags.length >= 20 && (e.key === 'Enter' || e.key === ',' || e.key === ' ')) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        const newTags = parseInput(inputValue);
        if (newTags.length > 0) {
          addTags(newTags);
          setInputValue('');
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      const newTags = parseInput(inputValue);
      addTags(newTags);
      setInputValue('');
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div 
      className={`
        min-h-[80px] px-3 py-2 rounded-lg bg-white/10 border border-white/20 
        text-white focus-within:border-blue-500/50 cursor-text transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleContainerClick}
      role="textbox"
      aria-label="Keyword input"
      aria-describedby="tag-help-text"
    >
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="
              inline-flex items-center gap-1 px-2 py-1 bg-blue-600/80 
              text-white text-sm rounded-md transition-colors
              hover:bg-blue-700/80
            "
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="
                  ml-1 text-white/80 hover:text-white hover:bg-white/20 
                  rounded-full w-4 h-4 flex items-center justify-center
                  text-xs transition-colors
                "
                aria-label={`Remove ${tag}`}
                tabIndex={-1}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onBlur={handleInputBlur}
        placeholder={tags.length === 0 ? placeholder : (tags.length >= 20 ? "Maximum erreicht" : "")}
        disabled={disabled || tags.length >= 20}
        maxLength={50}
        className="
          w-full bg-transparent text-white placeholder-blue-200/50 
          focus:outline-none border-none
        "
        style={{ minWidth: '120px' }}
        aria-describedby="tag-help-text"
      />
    </div>
  );
};

export default TagInput;