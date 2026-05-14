import { create } from 'zustand';

interface Assignment {
  id: string;
  class: string;
  subject: string;
  topic: string;
  fileName: string;
  fileData: string;
  fileType: string;
  createdAt: any;
  tutorId: string;
  tutorName: string;
}

interface AssignmentStore {
  assignments: Assignment[];
  setAssignments: (assignments: Assignment[]) => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: [],
  setAssignments: (assignments) => set({ assignments }),
}));
