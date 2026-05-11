import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { notificationService } from './notificationService';
import { Booking, BookingStatus } from '../types';

export const bookingService = {
  /**
   * Subscribe to real-time booking updates for a tutor
   */
  subscribeToTutorBookings(tutorId: string, callback: (bookings: Booking[]) => void) {
    const bQuery = query(collection(db, 'bookings'), where('tutorId', '==', tutorId));
    
    return onSnapshot(bQuery, (snap) => {
      const bookingList = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          name: data.studentName || data.name || 'Student'
        } as Booking;
      });
      
      // Sort locally by date descending
      bookingList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(bookingList);
    });
  },

  /**
   * Update booking status (confirm/cancel) and notify student
   */
  async updateStatus(id: string, status: BookingStatus, tutorName: string, bookingData: Booking) {
    const bookingRef = doc(db, 'bookings', id);
    await updateDoc(bookingRef, { status });

    if (bookingData.studentEmail) {
      if (status === 'confirmed') {
        await notificationService.notifyBookingConfirmed(
          bookingData.studentEmail,
          tutorName,
          bookingData.subject,
          bookingData.date,
          bookingData.time,
          Number(bookingData.amount)
        );
      } else if (status === 'cancelled') {
        await notificationService.notifyBookingCancelled(
          bookingData.studentEmail,
          tutorName,
          bookingData.subject
        );
      }
    }
  },

  /**
   * Reschedule a booking and notify student
   */
  async reschedule(id: string, date: string, time: string, tutorName: string, bookingData: Booking) {
    const bookingRef = doc(db, 'bookings', id);
    await updateDoc(bookingRef, {
      date,
      time,
      status: 'confirmed',
      tutorJoined: false,
      studentJoined: false,
      studentPresent: false,
      topic: '',
      durationConducted: 0,
      completedAt: null
    });

    if (bookingData.studentEmail) {
      await notificationService.notifyBookingRescheduled(
        bookingData.studentEmail,
        tutorName,
        bookingData.subject,
        date,
        time
      );
    }
  },

  /**
   * Finalize a booking session (mark as completed)
   */
  async finalizeSession(bookingId: string, updates: Partial<Booking>) {
    const bookingRef = doc(db, 'bookings', bookingId);
    return updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(bookingId: string, date: string, time: string, reason: string) {
    const bookingRef = doc(db, 'bookings', bookingId);
    return updateDoc(bookingRef, { 
      date, 
      time, 
      rescheduleReason: reason,
      status: 'pending', // Reset status for tutor to re-confirm
      updatedAt: serverTimestamp()
    });
  }
};
