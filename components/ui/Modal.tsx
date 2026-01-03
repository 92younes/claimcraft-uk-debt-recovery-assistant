import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap, useModalFocus } from '../../hooks/useModalFocus';

/**
 * Premium Modal Component
 *
 * World-class modal with:
 * - Glass morphism backdrop with animated blur
 * - Spring-physics scale animation on entry
 * - Premium shadow cascade for depth hierarchy
 * - Refined close button with satisfying hover states
 * - Proper focus management and accessibility
 * - Responsive design with mobile sheet variant
 */

export type ModalVariant = 'default' | 'centered' | 'fullscreen' | 'sheet';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Variant style */
  variant?: ModalVariant;
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
  /** Show a gradient header (for important modals) */
  gradientHeader?: boolean;
  /** Header gradient colors (when gradientHeader is true) */
  gradientFrom?: string;
  gradientTo?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  titleIcon,
  children,
  footer,
  variant = 'default',
  maxWidthClassName = 'max-w-md',
  maxHeightClassName = 'max-h-[85vh] sm:max-h-[90vh]',
  bodyClassName = 'p-5',
  headerClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  footerClassName = '',
  closeButtonClassName = '',
  closeOnOverlayClick = true,
  hideHeader = false,
  gradientHeader = false,
  gradientFrom = 'from-teal-500',
  gradientTo = 'to-teal-600',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus management + escape + scroll lock
  useModalFocus(isOpen, onClose, dialogRef);
  useFocusTrap(isOpen, dialogRef);

  if (!isOpen) return null;

  // Build responsive modal width classes based on variant
  const getWidthClasses = () => {
    switch (variant) {
      case 'fullscreen':
        return 'w-full h-full max-w-none max-h-none rounded-none';
      case 'sheet':
        return 'w-full sm:max-w-lg fixed bottom-0 left-0 right-0 sm:relative rounded-b-none sm:rounded-2xl';
      case 'centered':
      case 'default':
      default:
        return `w-full ${maxWidthClassName}`;
    }
  };

  // Overlay styles based on variant
  const getOverlayClasses = () => {
    const base = 'fixed inset-0 z-[60] flex p-4 sm:p-6';
    switch (variant) {
      case 'sheet':
        return `${base} items-end sm:items-center justify-center`;
      case 'fullscreen':
        return `${base} items-stretch justify-stretch p-0`;
      default:
        return `${base} items-center justify-center`;
    }
  };

  // Animation classes
  const getAnimationClasses = () => {
    switch (variant) {
      case 'sheet':
        return 'animate-slide-in-up sm:animate-scale-in';
      case 'fullscreen':
        return 'animate-fade-in';
      default:
        return 'animate-scale-in';
    }
  };

  // Header gradient classes
  const headerGradientClasses = gradientHeader
    ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white border-b-0`
    : 'border-b border-slate-200';

  return (
    <div
      className={`${getOverlayClasses()} bg-slate-900/60 backdrop-blur-md animate-backdrop-in`}
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        // Ensure proper stacking
        isolation: 'isolate',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`
          bg-white rounded-2xl overflow-hidden
          outline-none flex flex-col transform-gpu
          ${getWidthClasses()}
          ${variant !== 'fullscreen' ? maxHeightClassName : ''}
          ${getAnimationClasses()}
          shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.12)]
          border border-white/80
        `}
      >
        {hideHeader ? (
          <div className="sr-only">
            <h3 id={titleId}>{title}</h3>
            {description && <p>{description}</p>}
          </div>
        ) : (
          <div className={`
            relative p-4 sm:p-5 flex justify-between items-start gap-3 sm:gap-4 flex-shrink-0
            ${headerGradientClasses}
            ${headerClassName}
          `}>
            {/* Subtle gradient overlay for depth */}
            {gradientHeader && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            )}

            <div className="relative min-w-0 flex items-start gap-2 sm:gap-3">
              {titleIcon && (
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                  ${gradientHeader
                    ? 'bg-white/20 text-white'
                    : 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600'
                  }
                `}>
                  {titleIcon}
                </div>
              )}
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className={`
                    font-bold text-base sm:text-lg leading-tight
                    ${gradientHeader ? 'text-white' : titleClassName || 'text-slate-900'}
                  `}
                >
                  {title}
                </h3>
                {description && (
                  <p className={`
                    text-sm mt-1 leading-relaxed
                    ${gradientHeader ? 'text-white/80' : descriptionClassName || 'text-slate-500'}
                  `}>
                    {description}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className={`
                group/close relative p-2 rounded-xl flex-shrink-0
                transition-all duration-200 ease-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                active:scale-95
                ${gradientHeader
                  ? 'text-white/70 hover:text-white hover:bg-white/15 focus-visible:ring-white/50 focus-visible:ring-offset-teal-500'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-teal-500/50 focus-visible:ring-offset-white'
                }
                ${closeButtonClassName}
              `}
              aria-label="Close modal"
            >
              <X className="w-5 h-5 transition-transform duration-200 group-hover/close:rotate-90" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Body with custom scrollbar */}
        <div className={`${bodyClassName} flex-1 overflow-y-auto scroll-smooth`}>
          {children}
        </div>

        {/* Footer with subtle gradient and refined border */}
        {footer && (
          <div className={`
            p-4 sm:p-5 border-t border-slate-100/80
            bg-gradient-to-t from-slate-50/80 via-slate-50/40 to-transparent
            flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3
            flex-shrink-0
            ${footerClassName}
          `}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ConfirmModal - Pre-configured modal for confirmations
 */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const variantConfig = {
    danger: {
      gradientFrom: 'from-red-500',
      gradientTo: 'to-red-600',
      buttonVariant: 'danger' as const,
    },
    warning: {
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-amber-600',
      buttonVariant: 'warning' as const,
    },
    info: {
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      gradientHeader
      gradientFrom={config.gradientFrom}
      gradientTo={config.gradientTo}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`
              px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-150 disabled:opacity-50
              ${variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'warning'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </>
      }
    >
      <p className="text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
};

export default Modal;
