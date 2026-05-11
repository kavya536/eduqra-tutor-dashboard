import { Timestamp } from 'firebase/firestore';

export type UserStatus = 'active' | 'inactive';
export type TutorAccountStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export interface AuthState {
  user: any | null; // Firebase User
  profile: any | null; // Firestore User Data
  loading: boolean;
  profileLoading: boolean;
  isReapplying: boolean;
  prefilledEmail: string;
}
