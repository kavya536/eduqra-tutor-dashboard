export * from './auth.types';
export * from './booking.types';
export * from './tutor.types';
export * from './student.types';
export * from './chat.types';
export * from './notification.types';
export * from './payment.types';

export interface AvailabilitySlot {
  id: number;
  day: string;
  date?: string; // exact date e.g. "2026-04-07"
  start: string;
  end: string;
  booked: boolean;
  status?: 'free' | 'busy';
  type?: string;
}

export interface Review {
  id: string | number;
  name: string;
  subject: string;
  date: string;
  time: string;
  rating: number;
  text: string;
  studentName?: string;
}

export type PageId = 'dashboard' | 'chat' | 'availability' | 'pricing' | 'bookings' | 'notes' | 'assignments' | 'reviews' | 'kyc' | 'settings' | 'profile' | 'live-class' | 'projects';

