import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, TextArea } from './ui/Input';
import { DateInput } from './ui/DateInput';
import { ClaimState, DeadlinePriority } from '../types';
import { Calendar, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

interface AddDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, date: string, priority: DeadlinePriority, claimId: string) => void;
  claims: ClaimState[];
}

export const AddDeadlineModal: React.FC<AddDeadlineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  claims
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<DeadlinePriority>(DeadlinePriority.MEDIUM);
  const [claimId, setClaimId] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setPriority(DeadlinePriority.MEDIUM);
      setClaimId(claims.length > 0 ? claims[0].id : '');
    }
  }, [isOpen, claims]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !claimId) return;
    onSave(title, description, date, priority, claimId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Deadline"
      titleIcon={<Calendar className="w-5 h-5 text-teal-600" />}
      description="Create a manual deadline for your claims."
      maxWidthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Claim Selection */}
        <Select
          label="Related Claim"
          value={claimId}
          onChange={(e) => setClaimId(e.target.value)}
          options={[
            { value: '', label: 'Select a claim' },
            ...claims.map((claim) => ({
              value: claim.id,
              label: `${claim.defendant.name} (${claim.invoice.invoiceNumber})`
            }))
          ]}
          required
          noMargin
        />

        {/* Title */}
        <Input
          label="Deadline Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Follow up on payment"
          required
          noMargin
        />

        {/* Due Date */}
        <DateInput
          label="Due Date"
          value={date}
          onChange={(value) => setDate(value)}
          required
          noMargin
        />

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Deadline priority selection">
            {[
              { value: DeadlinePriority.LOW, label: 'Low', icon: Clock, color: 'text-slate-500' },
              { value: DeadlinePriority.MEDIUM, label: 'Medium', icon: Clock, color: 'text-amber-500' },
              { value: DeadlinePriority.HIGH, label: 'High', icon: AlertCircle, color: 'text-orange-500' },
              { value: DeadlinePriority.CRITICAL, label: 'Critical', icon: AlertTriangle, color: 'text-red-500' }
            ].map((option) => (
              <label
                key={option.value}
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:ring-offset-2
                  ${priority === option.value
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                    : 'border-slate-200 hover:bg-slate-50'}
                `}
              >
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={priority === option.value}
                  onChange={() => setPriority(option.value)}
                  aria-label={`${option.label} priority`}
                  className="sr-only"
                />
                <option.icon className={`w-5 h-5 ${option.color}`} aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <TextArea
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any additional details..."
          noMargin
        />

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Deadline
          </Button>
        </div>
      </form>
    </Modal>
  );
};




