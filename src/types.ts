export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: number;
  name: string;
  status: BookingStatus;
  subject: string;
  date: string;
  time: string;
  duration: string;
  message: string;
  studentPhone?: string;
  studentEmail?: string;
}

export interface Message {
  id: number;
  sender: 'me' | 'student';
  text: string;
  time: string;
}

export interface ChatContact {
  id: string;
  initials: string;
  online: boolean;
  unread: number;
  messages: Message[];
}

export interface AvailabilitySlot {
  id: number;
  day: string;
  start: string;
  end: string;
  booked: boolean;
}

export interface Review {
  id: number;
  name: string;
  subject: string;
  date: string;
  time: string;
  rating: number;
  text: string;
}

export type PageId = 'dashboard' | 'chat' | 'availability' | 'pricing' | 'bookings' | 'reviews' | 'kyc' | 'settings' | 'profile' | 'live-class';

export type NotificationType = 'booking' | 'message' | 'review';

export interface TutorNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}
