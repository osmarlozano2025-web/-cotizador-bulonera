import { useCallback, useEffect, useRef, useState } from "react";

interface UseAsyncActionResult<TArgs extends unknown[], TResult> {
  readonly run: (...args: TArgs) => Promise<TResult>;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * Wraps a single-call async action (a service call) with the standard
 * loading / error state machine used by every mutation hook in this app:
 * setLoading(true) -> try the action -> on failure store a human-readable
 * message and rethrow -> always clear loading.
 *
 * The action is kept in a ref so callers can pass an inline function
 * without needing to memoize it themselves, while `run` itself keeps a
 * stable identity across renders.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): UseAsyncActionResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });

  const run = useCallback(async (...args: TArgs) => {
    setLoading(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (actionError) {
      const nextError = actionError instanceof Error ? actionError.message : "Error inesperado.";
      setError(nextError);
      throw actionError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}
