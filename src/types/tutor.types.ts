import { Timestamp } from 'firebase/firestore';
import { TutorAccountStatus } from './auth.types';

export interface TutorProfile {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  phone: string;
  qualification: string;
  experience: string | number;
  identityProof: string; // URL
  certificate?: string; // URL
  demoVideo?: string; // URL
  avatar?: string;
  bio?: string;
  price?: number;
  rating: number;
  status: TutorAccountStatus;
  createdAt: Timestamp;
  upiId?: string;
  subjects?: string[];
  availability?: any[]; // Will refine later
  notificationPreferences?: {
    push: boolean;
    email?: boolean;
    reminders?: boolean;
    messages?: boolean;
    updates?: boolean;
  };
  activated?: boolean;
  first_login_completed?: boolean;
  email_verified?: boolean;
  email_verified_at?: any;
  classPricing?: string | number;
  pricingEntries?: any[];
  subjectsPricing?: any[];
  targetClasses?: string;
  kyc_submitted_at?: any;
}
