import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

export const notificationService = {
  /**
   * Send a notification to a student
   */
  async notifyStudent(studentEmail: string, title: string, message: string, type: 'booking' | 'chat' | 'payment' = 'booking', link: string = 'my-bookings', studentId?: string) {
    if (!studentEmail && !studentId) return;
    
    return addDoc(collection(db, 'notifications'), {
      studentEmail: studentEmail ? studentEmail.toLowerCase().trim() : '',
      userId: studentId || '', // Map studentId to userId for student-hub compatibility
      type,
      title,
      message,
      time: new Date().toISOString(),
      timestamp: serverTimestamp(),
      read: false,
      link
    });
  },

  /**
   * Notify student of a booking confirmation
   */
  async notifyBookingConfirmed(studentEmail: string, tutorName: string, subject: string, date: string, time: string, amount?: number, studentId?: string) {
    const title = 'Session Confirmed! ✅';
    const message = `${tutorName} confirmed your ${subject} session for ${date} at ${time}.${amount ? ` (Amount: ₹${amount})` : ''}`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'my-bookings', studentId);
  },

  /**
   * Notify student of a booking cancellation
   */
  async notifyBookingCancelled(studentEmail: string, tutorName: string, subject: string, studentId?: string) {
    const title = 'Session Cancelled ❌';
    const message = `${tutorName} cancelled your ${subject} session. Contact support for details.`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'my-bookings', studentId);
  },

  /**
   * Notify student of a booking reschedule
   */
  async notifyBookingRescheduled(studentEmail: string, tutorName: string, subject: string, date: string, time: string, studentId?: string) {
    const title = 'Session Rescheduled';
    const message = `Your ${subject} session with ${tutorName} has been moved to ${date} at ${time}.`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'my-bookings', studentId);
  },

  /**
   * Notify student of a new message
   */
  async notifyNewMessage(studentEmail: string, tutorName: string, messagePreview: string, studentId?: string) {
    const title = `New Message from ${tutorName}`;
    const message = messagePreview || 'Sent an attachment';
    return this.notifyStudent(studentEmail, title, message, 'chat', 'chat', studentId);
  },

  /**
   * Notify student of a new note
   */
  async notifyNewNote(studentEmail: string, tutorName: string, subject: string) {
    const title = 'New Study Material 📚';
    const message = `${tutorName} shared new notes: "${subject}"`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'notes');
  },

  /**
   * Notify student of a new poll
   */
  async notifyNewPoll(studentEmail: string, tutorName: string) {
    const title = 'New Interactive Poll 📊';
    const message = `${tutorName} launched a new poll for your class.`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'notes');
  },

  /**
   * Notify student of a new assignment
   */
  async notifyNewAssignment(studentEmail: string, tutorName: string, subject: string) {
    const title = 'New Assignment 📝';
    const message = `${tutorName} shared a new assessment for ${subject}.`;
    return this.notifyStudent(studentEmail, title, message, 'booking', 'assignments');
  }
};
