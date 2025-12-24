import { useEffect, useRef, useCallback } from 'react';
import { useBeforeUnload } from './useBeforeUnload';

interface UseUnsavedChangesOptions {
  when: boolean;
  message?: string;
}

/**
 * Hook to detect unsaved changes and prompt user before navigation
 *
 * @param when - Whether there are unsaved changes
 * @param message - Custom message to show in confirmation dialog
 */
export const useUnsavedChanges = ({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesOptions) => {
  const messageRef = useRef(message);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Handle browser navigation (refresh, close tab, etc.)
  useBeforeUnload(when, message);

  // Return a function that can be called to check if navigation should proceed
  const shouldBlockNavigation = useCallback(() => {
    return when;
  }, [when]);

  const confirmNavigation = useCallback(() => {
    if (!when) return true;
    return window.confirm(messageRef.current);
  }, [when]);

  return {
    shouldBlockNavigation,
    confirmNavigation,
    hasUnsavedChanges: when
  };
};
