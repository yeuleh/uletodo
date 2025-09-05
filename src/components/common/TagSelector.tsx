import React, { useState, useRef, useEffect } from 'react';
import { Tag } from '@/types';
import './TagSelector.css';

export interface TagSelectorProps {
  selectedTags: string[];
  availableTags: Tag[];
  onTagsChange: (tags: string[]) => void;
  onCreateTag?: (tagName: string) => Promise<Tag>;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  maxTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  availableTags,
  onTagsChange,
  onCreateTag,
  placeholder = 'Add tags...',
  label,
  error,
  disabled = false,
  fullWidth = false,
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input and exclude already selected tags
  const filteredTags = availableTags.filter(tag => 
    !selectedTags.includes(tag.name) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if input value could create a new tag
  const canCreateNewTag = inputValue.trim() && 
    !availableTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) &&
    !selectedTags.includes(inputValue.trim()) &&
    onCreateTag;

  // All options (filtered tags + create new option)
  const allOptions = [
    ...filteredTags,
    ...(canCreateNewTag ? [{ 
      id: 'create-new', 
      name: inputValue.trim(), 
      color: '#646cff', 
      createdAt: new Date(), 
      usageCount: 0,
      isNew: true 
    } as Tag & { isNew: boolean }] : [])
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : allOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && allOptions[focusedIndex]) {
          handleSelectTag(allOptions[focusedIndex]);
        } else if (inputValue.trim()) {
          // Create new tag if no option is focused but there's input
          if (canCreateNewTag) {
            handleCreateTag(inputValue.trim());
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Backspace':
        if (!inputValue && selectedTags.length > 0) {
          // Remove last tag if input is empty
          const newTags = selectedTags.slice(0, -1);
          onTagsChange(newTags);
        }
        break;
      case ',':
      case 'Tab':
        if (inputValue.trim() && canCreateNewTag) {
          event.preventDefault();
          handleCreateTag(inputValue.trim());
        }
        break;
    }
  };

  const handleSelectTag = async (tag: Tag & { isNew?: boolean }) => {
    if (maxTags && selectedTags.length >= maxTags) return;

    let tagName = tag.name;
    
    if (tag.isNew && onCreateTag) {
      try {
        const newTag = await onCreateTag(tag.name);
        tagName = newTag.name;
      } catch (error) {
        console.error('Failed to create tag:', error);
        return;
      }
    }

    const newTags = [...selectedTags, tagName];
    onTagsChange(newTags);
    setInputValue('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleCreateTag = async (tagName: string) => {
    if (!onCreateTag || maxTags && selectedTags.length >= maxTags) return;

    try {
      const newTag = await onCreateTag(tagName);
      const newTags = [...selectedTags, newTag.name];
      onTagsChange(newTags);
      setInputValue('');
      setIsOpen(false);
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
    inputRef.current?.focus();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const getTagColor = (tagName: string): string => {
    const tag = availableTags.find(t => t.name === tagName);
    return tag?.color || '#646cff';
  };

  const baseClass = 'tag-selector';
  const errorClass = error ? 'tag-selector--error' : '';
  const fullWidthClass = fullWidth ? 'tag-selector--full-width' : '';
  const disabledClass = disabled ? 'tag-selector--disabled' : '';
  
  const wrapperClasses = [baseClass, errorClass, fullWidthClass, disabledClass]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} ref={containerRef}>
      {label && (
        <label className="tag-selector__label">
          {label}
        </label>
      )}
      
      <div className="tag-selector__field">
        <div className="tag-selector__tags">
          {selectedTags.map((tagName) => (
            <span
              key={tagName}
              className="tag-selector__tag"
              style={{ backgroundColor: getTagColor(tagName) }}
            >
              {tagName}
              {!disabled && (
                <button
                  type="button"
                  className="tag-selector__tag-remove"
                  onClick={() => handleRemoveTag(tagName)}
                  aria-label={`Remove ${tagName} tag`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          
          <input
            ref={inputRef}
            type="text"
            className="tag-selector__input"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            disabled={disabled || !!(maxTags && selectedTags.length >= maxTags)}
          />
        </div>

        {isOpen && allOptions.length > 0 && (
          <div className="tag-selector__dropdown">
            {allOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={`tag-selector__option ${
                  index === focusedIndex ? 'tag-selector__option--focused' : ''
                }`}
                onClick={() => handleSelectTag(option)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span
                  className="tag-selector__option-color"
                  style={{ backgroundColor: option.color }}
                />
                <span className="tag-selector__option-name">
                  {option.name}
                </span>
                {(option as any).isNew && (
                  <span className="tag-selector__option-badge">Create new</span>
                )}
                {!((option as any).isNew) && option.usageCount > 0 && (
                  <span className="tag-selector__option-count">
                    {option.usageCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="tag-selector__helper tag-selector__helper--error">
          {error}
        </div>
      )}
      
      {maxTags && (
        <div className="tag-selector__helper">
          {selectedTags.length}/{maxTags} tags
        </div>
      )}
    </div>
  );
};