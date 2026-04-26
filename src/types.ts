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
  isSubscription?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled';
  nextBillingDate?: any;
  studentName?: string;
  reviewSubmitted?: boolean;
  reviewRating?: number;
  reviewComment?: string;
  amount?: number | string;
  type?: 'demo' | 'paid';
  tutorId?: string;
  studentId?: string;
  createdAt?: any;
  paymentId?: string;
  orderId?: string;
  paidAt?: any;
  isJoiningGroup?: boolean;
  groupId?: string;
  plan?: string;
  subjectsPricing?: any;
  studentType?: string;
}

export interface Message {
  id: string | number;
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
  studentEmail?: string;
  avatar?: string;
}

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

export type PageId = 'dashboard' | 'chat' | 'availability' | 'pricing' | 'bookings' | 'notes' | 'reviews' | 'kyc' | 'settings' | 'profile' | 'live-class';

export type NotificationType = 'booking' | 'message' | 'review';

export interface TutorNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}
