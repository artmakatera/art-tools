import { useEffect, useRef } from 'react';

export function usePropsWatcher<T extends Record<string, unknown>>(props: T) {
  const prevProps = useRef<T>(props);

  useEffect(() => {
    const changedProps: Record<string, { from: unknown; to: unknown }> = {};

    // Use plain records for safe indexing
    const prev = prevProps.current as Record<string, unknown>;
    const next = props as Record<string, unknown>;

    // Check for changed or deleted keys
    Object.keys({ ...prev, ...next }).forEach((key) => {
      if (prev[key] !== next[key]) {
        changedProps[key] = {
          from: prev[key],
          to: next[key],
        };
      }
    });

    if (Object.keys(changedProps).length > 0) {
      console.log('[Props Changed]:', changedProps);
    }

    prevProps.current = props;
  });
}