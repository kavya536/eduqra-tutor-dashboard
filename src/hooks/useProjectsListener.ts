import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useProjectsStore } from '../store/useProjectsStore';
import { projectService } from '../services/projectService';

export function useProjectsListener() {
  const { profile } = useAuthStore();
  const { setProjects } = useProjectsStore();

  useEffect(() => {
    if (!profile?.id) return;

    const unsubProjects = projectService.subscribeToProjects(profile.id, (list) => {
      setProjects(list);
    });

    return () => {
      unsubProjects();
    };
  }, [profile?.id, setProjects]);
}
