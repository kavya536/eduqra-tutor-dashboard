import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotesStore } from '../store/useNotesStore';
import { usePollStore } from '../store/usePollStore';
import { notesService } from '../services/notesService';
import { pollService } from '../services/pollService';

export function useNotesListener() {
  const { profile } = useAuthStore();
  const { setNotes } = useNotesStore();
  const { setPolls } = usePollStore();

  useEffect(() => {
    if (!profile?.id) return;

    const unsubNotes = notesService.subscribeToNotes(profile.id, (list) => {
      setNotes(list);
    });

    const unsubPolls = pollService.subscribeToPolls(profile.id, (list) => {
      setPolls(list as any[]);
    });

    return () => {
      unsubNotes();
      unsubPolls();
    };
  }, [profile?.id, setNotes, setPolls]);
}
