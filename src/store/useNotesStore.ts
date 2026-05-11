import { create } from 'zustand';

interface NotesState {
  notes: any[];
  setNotes: (notes: any[]) => void;
  addNote: (note: any) => void;
  removeNote: (id: string) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  removeNote: (id) => set((state) => ({ notes: state.notes.filter(n => n.id !== id) })),
}));
