/**
 * SavedFilters component for managing and applying saved filters
 */

import React, { useState, useEffect } from 'react';
import type { SavedFilter } from '@/types/Task.types';
import { useSavedFilters } from '@/stores/hooks';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import './SavedFilters.css';

interface SavedFiltersProps {
  className?: string;
  showBuiltIn?: boolean;
  showCustom?: boolean;
  compact?: boolean;
  onFilterApplied?: (filter: SavedFilter) => void;
}

export const SavedFilters: React.FC<SavedFiltersProps> = ({
  className = '',
  showBuiltIn = true,
  showCustom = true,
  compact = false,
  onFilterApplied
}) => {
  const {
    savedFilters,
    activeFilterId,
    loadSavedFilters,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
    getBuiltInFilters,
    getCustomFilters,
    getMostUsedFilters
  } = useSavedFilters();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedFilters();
  }, [loadSavedFilters]);

  const handleApplyFilter = (filter: SavedFilter) => {
    applySavedFilter(filter.id);
    onFilterApplied?.(filter);
  };

  const handleSaveCurrentFilter = () => {
    if (!saveFilterName.trim()) {
      setSaveError('Filter name is required');
      return;
    }

    // Check for duplicate names
    const existingFilter = savedFilters.find(
      f => f.name.toLowerCase() === saveFilterName.trim().toLowerCase()
    );
    
    if (existingFilter) {
      setSaveError('A filter with this name already exists');
      return;
    }

    try {
      saveCurrentFilter(saveFilterName.trim());
      setShowSaveDialog(false);
      setSaveFilterName('');
      setSaveError(null);
    } catch (error) {
      setSaveError('Failed to save filter');
    }
  };

  const handleDeleteFilter = (filterId: string) => {
    const success = deleteSavedFilter(filterId);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const builtInFilters = getBuiltInFilters();
  const customFilters = getCustomFilters();
  const mostUsedFilters = getMostUsedFilters(3);

  if (compact) {
    return (
      <div className={`saved-filters saved-filters--compact ${className}`}>
        <div className="saved-filters__quick-actions">
          {builtInFilters.slice(0, 4).map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilterId === filter.id ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleApplyFilter(filter)}
              className="saved-filters__quick-button"
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`saved-filters ${className}`}>
      <div className="saved-filters__header">
        <h3 className="saved-filters__title">Saved Filters</h3>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setShowSaveDialog(true)}
          className="saved-filters__save-button"
        >
          Save Current
        </Button>
      </div>

      {/* Built-in filters */}
      {showBuiltIn && builtInFilters.length > 0 && (
        <div className="saved-filters__section">
          <h4 className="saved-filters__section-title">Quick Filters</h4>
          <div className="saved-filters__list">
            {builtInFilters.map((filter) => (
              <div
                key={filter.id}
                className={`saved-filters__item ${
                  activeFilterId === filter.id ? 'saved-filters__item--active' : ''
                }`}
              >
                <button
                  className="saved-filters__item-button"
                  onClick={() => handleApplyFilter(filter)}
                >
                  <span className="saved-filters__item-name">{filter.name}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most used filters */}
      {showCustom && mostUsedFilters.length > 0 && (
        <div className="saved-filters__section">
          <h4 className="saved-filters__section-title">Most Used</h4>
          <div className="saved-filters__list">
            {mostUsedFilters.map((filter) => (
              <div
                key={filter.id}
                className={`saved-filters__item ${
                  activeFilterId === filter.id ? 'saved-filters__item--active' : ''
                }`}
              >
                <button
                  className="saved-filters__item-button"
                  onClick={() => handleApplyFilter(filter)}
                >
                  <span className="saved-filters__item-name">{filter.name}</span>
                  <span className="saved-filters__item-usage">
                    Used {filter.usageCount} times
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setDeleteConfirm(filter.id)}
                  className="saved-filters__delete-button"
                  aria-label={`Delete ${filter.name} filter`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom filters */}
      {showCustom && customFilters.length > 0 && (
        <div className="saved-filters__section">
          <h4 className="saved-filters__section-title">
            Custom Filters ({customFilters.length})
          </h4>
          <div className="saved-filters__list">
            {customFilters
              .filter(f => !mostUsedFilters.includes(f))
              .map((filter) => (
                <div
                  key={filter.id}
                  className={`saved-filters__item ${
                    activeFilterId === filter.id ? 'saved-filters__item--active' : ''
                  }`}
                >
                  <button
                    className="saved-filters__item-button"
                    onClick={() => handleApplyFilter(filter)}
                  >
                    <span className="saved-filters__item-name">{filter.name}</span>
                    {filter.lastUsed && (
                      <span className="saved-filters__item-date">
                        Last used: {filter.lastUsed.toLocaleDateString()}
                      </span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setDeleteConfirm(filter.id)}
                    className="saved-filters__delete-button"
                    aria-label={`Delete ${filter.name} filter`}
                  >
                    ×
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Save filter dialog */}
      <Modal
        isOpen={showSaveDialog}
        onClose={() => {
          setShowSaveDialog(false);
          setSaveFilterName('');
          setSaveError(null);
        }}
        title="Save Current Filter"
      >
        <div className="saved-filters__save-form">
          <Input
            label="Filter Name"
            value={saveFilterName}
            onChange={(e) => {
              setSaveFilterName(e.target.value);
              setSaveError(null);
            }}
            placeholder="Enter a name for this filter"
            error={saveError || undefined}
            autoFocus
          />
          <div className="saved-filters__save-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSaveDialog(false);
                setSaveFilterName('');
                setSaveError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCurrentFilter}
              disabled={!saveFilterName.trim()}
            >
              Save Filter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteFilter(deleteConfirm)}
        title="Delete Filter"
        message="Are you sure you want to delete this saved filter? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SavedFilters;