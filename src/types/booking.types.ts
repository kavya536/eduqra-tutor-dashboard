import { Timestamp } from 'firebase/firestore';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'live' | 'unpaid';

export interface ParticipantData {
  name: string;
  joinTime: Timestamp | null;
  leaveTime: Timestamp | null;
  status: 'attended' | 'not_attended' | 'pending' | 'not_conducted';
}

export interface Booking {
  id: string | number;
  name: string;
  status: BookingStatus;
  subject: string;
  date: string;
  time: string;
  duration: string;
  message: string;
  studentPhone?: string;
  studentEmail?: string;
  studentPresent?: boolean;
  attendance_status?: 'attended' | 'not_attended' | 'pending' | 'not_conducted';
  studentJoinTime?: Timestamp | null;
  studentLeaveTime?: Timestamp | null;
  topic?: string;
  tutorJoined?: boolean;
  studentJoined?: boolean;
  durationConducted?: number; // in minutes
  completedAt?: Timestamp | null;
  studentAvatar?: string;
  isRescheduled?: boolean;
  isGroup?: boolean;
  maxParticipants?: number;
  participantCount?: number;
  participants?: string[];
  participantData?: Record<string, ParticipantData>;
  startedAt?: Timestamp | null;
  isSubscription?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled';
  nextBillingDate?: Timestamp | null;
  studentName?: string;
  reviewSubmitted?: boolean;
  reviewRating?: number;
  reviewComment?: string;
  amount?: number | string;
  type?: 'demo' | 'paid';
  tutorId?: string;
  studentId?: string;
  createdAt?: Timestamp | null;
  paymentId?: string;
  orderId?: string;
  paidAt?: Timestamp | null;
  isJoiningGroup?: boolean;
  groupId?: string;
  plan?: string;
  subjectsPricing?: any;
  studentType?: string;
}
