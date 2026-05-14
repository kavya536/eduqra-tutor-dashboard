import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAssignmentStore } from '../store/useAssignmentStore';
import { assignmentService } from '../services/assignmentService';

export function useAssignmentListener() {
  const user = useAuthStore(state => state.user);
  const setAssignments = useAssignmentStore(state => state.setAssignments);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = assignmentService.subscribeToAssignments(user.uid, (assignments) => {
      setAssignments(assignments);
    });

    return () => unsubscribe();
  }, [user, setAssignments]);
}
