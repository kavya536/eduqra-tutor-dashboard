import { Timestamp } from 'firebase/firestore';
import { UserStatus } from './auth.types';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  class: string;
  board: string;
  avatar?: string;
  status: UserStatus;
  createdAt: Timestamp;
}
