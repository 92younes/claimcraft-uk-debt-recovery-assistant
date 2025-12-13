import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap, useModalFocus } from '../../hooks/useModalFocus';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width class (e.g. "max-w-md", "max-w-lg"). Responsive by default. */
  maxWidthClassName?: string;
  /** Max height class (e.g. "max-h-[90vh]") */
  maxHeightClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  closeButtonClassName?: string;
  closeOnOverlayClick?: boolean;
  hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  titleIcon,
  children,
  footer,
  maxWidthClassName = 'max-w-md',
  maxHeightClassName = 'max-h-[90vh]',
  bodyClassName = 'p-5',
  headerClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  footerClassName = '',
  closeButtonClassName = '',
  closeOnOverlayClick = true,
  hideHeader = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus management + escape + scroll lock
  useModalFocus(isOpen, onClose, dialogRef);
  useFocusTrap(isOpen, dialogRef);

  if (!isOpen) return null;

  // Build responsive modal width classes
  // On mobile (< sm), modal takes full width minus padding
  // On larger screens, use the specified maxWidthClassName
  const responsiveWidthClass = `w-full sm:${maxWidthClassName}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-2xl ${responsiveWidthClass} ${maxHeightClassName} overflow-hidden border border-slate-200 outline-none flex flex-col animate-scale-in`}
      >
        {hideHeader ? (
          <div className="sr-only">
            <h3 id={titleId}>{title}</h3>
            {description && <p>{description}</p>}
          </div>
        ) : (
          <div className={`p-4 sm:p-5 border-b border-slate-200 flex justify-between items-start gap-3 sm:gap-4 ${headerClassName}`}>
            <div className="min-w-0 flex items-start gap-2 sm:gap-3">
              {titleIcon && <div className="flex-shrink-0">{titleIcon}</div>}
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className={`font-bold text-base sm:text-lg ${titleClassName || 'text-slate-900'}`}
                >
                  {title}
                </h3>
                {description && (
                  <p className={`text-sm mt-1 ${descriptionClassName || 'text-slate-500'}`}>
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${closeButtonClassName}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className={`${bodyClassName} flex-1 overflow-y-auto`}>{children}</div>

        {footer && (
          <div className={`p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};


