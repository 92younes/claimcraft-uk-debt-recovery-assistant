import { useEffect } from 'react';

/**
 * Hook to warn users before they navigate away from the page
 * when there are unsaved changes
 *
 * @param when - Whether to show the warning
 * @param message - Warning message
 */
export const useBeforeUnload = (when: boolean, message: string = 'You have unsaved changes.') => {
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers ignore custom messages for security reasons
      // but we still need to set returnValue to trigger the confirmation dialog
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);
};
