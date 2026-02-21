import React, { createContext, useContext } from 'react';
import { useDownloadManagerState } from '@/hooks/useDownloadManager';

type DownloadManagerValue = ReturnType<typeof useDownloadManagerState>;

const DownloadManagerContext = createContext<DownloadManagerValue | null>(null);

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const value = useDownloadManagerState(); // useMemo applied inside hook
  return <DownloadManagerContext value={value}>{children}</DownloadManagerContext>;
}

export function useDownloadManager(): DownloadManagerValue {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx) throw new Error('useDownloadManager must be used within DownloadManagerProvider');
  return ctx;
}
