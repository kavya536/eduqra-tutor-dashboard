import { create } from 'zustand';

interface ProjectsState {
  projects: any[];
  setProjects: (projects: any[]) => void;
  addProject: (project: any) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
}));
