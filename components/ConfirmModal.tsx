import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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

  const variantStyles = {
    danger: {
      header: 'bg-gradient-to-r from-red-600 to-red-700',
      icon: 'bg-red-500/20 text-red-400',
      button: 'bg-red-600 hover:bg-red-500'
    },
    warning: {
      header: 'bg-gradient-to-r from-amber-600 to-amber-700',
      icon: 'bg-amber-500/20 text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-500'
    },
    info: {
      header: 'bg-gradient-to-r from-violet-600 to-violet-700',
      icon: 'bg-violet-500/20 text-violet-400',
      button: 'bg-violet-600 hover:bg-violet-500'
    }
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-700 rounded-2xl shadow-dark-xl max-w-md w-full overflow-hidden animate-scale-in border border-dark-600">
        {/* Header */}
        <div className={`${styles.header} text-white p-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${styles.icon} rounded-full flex items-center justify-center`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="bg-dark-800 border-t border-dark-600 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-dark-600 border border-dark-500 hover:bg-dark-500 text-slate-300 rounded-xl font-medium transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-6 py-3 ${styles.button} text-white rounded-xl font-bold transition-colors duration-200 shadow-md`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
