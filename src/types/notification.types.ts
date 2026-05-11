export type NotificationType = 'booking' | 'message' | 'review' | 'system';

export interface TutorNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  metadata?: {
    bookingId?: string;
    chatId?: string;
    reviewId?: string;
  };
}
