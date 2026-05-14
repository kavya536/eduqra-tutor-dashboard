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
      }).filter(b => b.status !== 'unpaid');
      
      const getSortMs = (item: any) => {
         if (item.date) {
            const timeStr = item.time || '00:00';
            const d = new Date(`${item.date} ${timeStr}`);
            if (!isNaN(d.getTime())) return d.getTime();
            const d2 = new Date(item.date);
            if (!isNaN(d2.getTime())) return d2.getTime();
         }
         if (item.createdAt?.toMillis) return item.createdAt.toMillis();
         if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
         if (item.timestamp?.toMillis) return item.timestamp.toMillis();
         if (item.timestamp?.seconds) return item.timestamp.seconds * 1000;
         return 0;
      };
      
      bookingList.sort((a, b) => getSortMs(b) - getSortMs(a));
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
          Number(bookingData.amount),
          bookingData.studentId
        );
      } else if (status === 'cancelled') {
        await notificationService.notifyBookingCancelled(
          bookingData.studentEmail,
          tutorName,
          bookingData.subject,
          bookingData.studentId
        );
      }
    }
  },

  /**
   * Reschedule a booking and notify student
   */
  async reschedule(id: string, date: string, time: string, tutorName: string, bookingData: Booking, scope?: 'one-day' | 'full-course') {
    const bookingRef = doc(db, 'bookings', id);
    
    const updates: any = {
      status: 'confirmed',
      tutorJoined: false,
      studentJoined: false,
      studentPresent: false,
      topic: '',
      durationConducted: 0,
      completedAt: null
    };

    if (scope === 'full-course') {
      updates.date = date;
      updates.time = time;
    } else {
      // One-day override
      const rescheduledDays = { ...(bookingData.rescheduledDays || {}) };
      rescheduledDays[date] = time;
      updates.rescheduledDays = rescheduledDays;
    }

    await updateDoc(bookingRef, updates);

    if (bookingData.studentEmail) {
      await notificationService.notifyBookingRescheduled(
        bookingData.studentEmail,
        tutorName,
        bookingData.subject,
        date,
        time,
        bookingData.studentId
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
  },

  /**
   * Update attendance status
   */
  async updateAttendance(id: string, attendanceStatus: string, status: string) {
    const bookingRef = doc(db, 'bookings', id);
    return updateDoc(bookingRef, {
      attendance_status: attendanceStatus,
      status: status,
      updatedAt: serverTimestamp()
    });
  }
};
