import { useMemo, useCallback } from 'react';
import snippetsDataEn from '@/data/gita_snippets.json';
import snippetsDataHi from '@/data/gita_snippets_hindi.json';
import { Snippet } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export function useSnippets() {
  const { language } = useLanguage();

  const snippets = useMemo(() => {
    const data = language === 'hi' ? snippetsDataHi : snippetsDataEn;
    return data.snippets as Snippet[];
  }, [language]);

  const getSnippet = useCallback((id: number): Snippet | undefined => {
    return snippets.find((s) => s.id === id);
  }, [snippets]);

  const getNextSnippet = useCallback((currentId: number): Snippet | undefined => {
    return snippets.find((s) => s.id === currentId + 1);
  }, [snippets]);

  const getPrevSnippet = useCallback((currentId: number): Snippet | undefined => {
    return snippets.find((s) => s.id === currentId - 1);
  }, [snippets]);

  return {
    snippets,
    getSnippet,
    getNextSnippet,
    getPrevSnippet,
    totalCount: snippets.length,
  };
}
