import { useCallback, useRef } from "react";

export function useScrollSync() {
  const taskListRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const onTaskListScroll = useCallback(() => {
    if (isSyncing.current) return;
    if (!taskListRef.current || !gridRef.current) return;
    isSyncing.current = true;
    gridRef.current.scrollTop = taskListRef.current.scrollTop;
    isSyncing.current = false;
  }, []);

  const onGridScroll = useCallback(() => {
    if (isSyncing.current) return;
    if (!taskListRef.current || !gridRef.current) return;
    isSyncing.current = true;
    taskListRef.current.scrollTop = gridRef.current.scrollTop;
    isSyncing.current = false;
  }, []);

  return { taskListRef, gridRef, onTaskListScroll, onGridScroll };
}
