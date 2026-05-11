import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import { bookingService } from '../services/bookingService';

export function useBookingListener() {
  const { profile } = useAuthStore();
  const { setBookings } = useBookingStore();

  useEffect(() => {
    if (!profile?.id) return;

    const unsub = bookingService.subscribeToTutorBookings(profile.id, (bookingList) => {
      setBookings(bookingList);
    });

    return () => unsub();
  }, [profile?.id, setBookings]);
}
