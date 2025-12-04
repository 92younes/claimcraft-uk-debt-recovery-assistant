/**
 * Custom hook for handling async operations with loading state
 *
 * Replaces the repeated pattern of:
 * - setIsProcessing(true)
 * - setProcessingText("...")
 * - try { ... } finally { setIsProcessing(false) }
 */

import { useState, useCallback } from 'react';

interface UseAsyncOperationResult {
  isProcessing: boolean;
  processingText: string;
  error: string | null;
  execute: <T>(text: string, fn: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
}

export const useAsyncOperation = (): UseAsyncOperationResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(text: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setIsProcessing(true);
    setProcessingText(text);
    setError(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Async operation failed:', err);
      return undefined;
    } finally {
      setIsProcessing(false);
      setProcessingText('');
    }
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProcessingText('');
    setError(null);
  }, []);

  return {
    isProcessing,
    processingText,
    error,
    execute,
    reset
  };
};
