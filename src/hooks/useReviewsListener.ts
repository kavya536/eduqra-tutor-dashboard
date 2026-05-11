import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useReviewStore } from '../store/useReviewStore';
import { tutorService } from '../services/tutorService';

export function useReviewsListener() {
  const { profile } = useAuthStore();
  const { setReviews } = useReviewStore();

  useEffect(() => {
    if (!profile?.id) return;

    const unsub = tutorService.subscribeToReviews(profile.id, (list) => {
      setReviews(list as any[]);
    });

    return () => unsub();
  }, [profile?.id, setReviews]);
}
