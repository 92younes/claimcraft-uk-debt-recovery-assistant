import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const iconContainerClass =
    variant === 'danger'
      ? 'bg-red-100 text-red-600'
      : variant === 'warning'
        ? 'bg-amber-100 text-amber-600'
        : 'bg-teal-50 text-teal-600';

  const confirmVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidthClassName="max-w-md"
      titleIcon={(
        <div className={`w-12 h-12 ${iconContainerClass} rounded-xl flex items-center justify-center`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
      )}
      footer={(
        <div className="w-full flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} className="flex-1">
            {confirmText}
          </Button>
        </div>
      )}
    >
      <p className="text-base text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
};
