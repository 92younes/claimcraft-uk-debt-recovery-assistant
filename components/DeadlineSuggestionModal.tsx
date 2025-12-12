
import React, { useState } from 'react';
import { Deadline } from '../types';
import { Calendar, Check, HelpCircle, Clock } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { DEADLINE_TYPE_LABELS } from '../constants';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DeadlineSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: Deadline[];
  onAccept: (deadlines: Deadline[]) => void;
  claimDefendantName: string;
}

export const DeadlineSuggestionModal: React.FC<DeadlineSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onAccept,
  claimDefendantName,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(suggestions.map(s => s.id));
  const [editedDates, setEditedDates] = useState<Record<string, string>>({});

  if (!isOpen || suggestions.length === 0) return null;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDateChange = (id: string, date: string) => {
    setEditedDates(prev => ({ ...prev, [id]: date }));
  };

  const handleAccept = () => {
    const accepted = suggestions
      .filter(s => selectedIds.includes(s.id))
      .map(s => ({
        ...s,
        dueDate: editedDates[s.id] || s.dueDate,
      }));
    onAccept(accepted);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Suggested Deadlines"
      description={`Based on UK legal requirements for ${claimDefendantName}`}
      maxWidthClassName="max-w-2xl"
      titleIcon={(
        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
          <Calendar className="w-6 h-6 text-teal-600" />
        </div>
      )}
      footer={(
        <div className="w-full flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleAccept}
            disabled={selectedIds.length === 0}
            className="flex-1"
          >
            Add {selectedIds.length} Deadline{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    >
      <p className="text-slate-500 text-sm mb-4">
        Select the deadlines you'd like to add to your calendar. You can adjust the dates if needed.
      </p>

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              selectedIds.includes(suggestion.id)
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            onClick={() => toggleSelection(suggestion.id)}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(suggestion.id);
                }}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  selectedIds.includes(suggestion.id)
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'border-slate-300 hover:border-teal-500'
                }`}
                aria-label={selectedIds.includes(suggestion.id) ? 'Deselect deadline' : 'Select deadline'}
              >
                {selectedIds.includes(suggestion.id) && <Check className="w-4 h-4" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900">{suggestion.title}</p>
                  {suggestion.legalReference && (
                    <Tooltip content={suggestion.legalReference}>
                      <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                    </Tooltip>
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-3">{suggestion.description}</p>

                {/* Type badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                    {DEADLINE_TYPE_LABELS[suggestion.type] || suggestion.type}
                  </span>
                </div>

                {/* Date Input */}
                <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <label className="text-sm font-medium text-slate-500">Due Date:</label>
                  <input
                    type="date"
                    value={editedDates[suggestion.id] || suggestion.dueDate}
                    onChange={(e) => handleDateChange(suggestion.id, e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
