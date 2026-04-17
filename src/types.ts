export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';

export interface Booking {
  id: string | number;
  name: string;
  status: BookingStatus | 'live' | 'unpaid';
  subject: string;
  date: string;
  time: string;
  duration: string;
  message: string;
  studentPhone?: string;
  studentEmail?: string;
  studentPresent?: boolean;
  attendance_status?: 'attended' | 'not_attended' | 'pending';
  studentJoinTime?: any;
  studentLeaveTime?: any;
  topic?: string;
  tutorJoined?: boolean;
  studentJoined?: boolean;
  durationConducted?: number; // in minutes
  completedAt?: any;
  studentAvatar?: string;
  isRescheduled?: boolean;
  isGroup?: boolean;
  maxParticipants?: number;
  participantCount?: number;
  participants?: string[];
  participantData?: {
    [email: string]: {
      name: string;
      joinTime: any;
      leaveTime: any;
      status: 'attended' | 'not_attended' | 'pending';
    }
  };
  startedAt?: any;
}

export interface Message {
  id: number;
  sender: 'me' | 'student';
  text: string;
  time: string;
  date?: string;
  deletedForEveryone?: boolean;
  edited?: boolean;
  type?: 'text' | 'file' | 'image' | 'poll';
  pollData?: any;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

export interface ChatContact {
  id: string;
  name?: string;
  initials: string;
  online: boolean;
  unread: number;
  messages: Message[];
}

export interface AvailabilitySlot {
  id: number;
  day: string;
  date?: string; // exact date e.g. "2026-04-07"
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
