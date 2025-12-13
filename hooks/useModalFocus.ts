import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook to manage modal focus behavior:
 * - Saves focus on open
 * - Focuses modal container on open
 * - Restores focus on close
 * - Handles escape key to close
 * - Prevents body scroll when open
 */
export function useModalFocus(
  isOpen: boolean,
  onClose: () => void,
  modalRef: RefObject<HTMLElement>
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
  const previousBodyPaddingRightRef = useRef<string | null>(null);

  // Save focus when modal opens, restore when it closes
  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the modal container (needs tabIndex to be focusable)
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);

      // Prevent body scroll
      const body = document.body;
      previousBodyOverflowRef.current = body.style.overflow ?? '';
      previousBodyPaddingRightRef.current = body.style.paddingRight ?? '';

      // Avoid layout shift when scrollbar disappears
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      // Restore body scroll
      const body = document.body;
      body.style.overflow = previousBodyOverflowRef.current ?? '';
      body.style.paddingRight = previousBodyPaddingRightRef.current ?? '';

      // Restore focus to previous element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, modalRef]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}

/**
 * Simple focus trap within a modal
 * Keeps Tab/Shift+Tab cycling within focusable elements
 */
export function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, containerRef]);
}
