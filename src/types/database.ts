import { Timestamp } from 'firebase/firestore';

export type UserStatus = 'active' | 'inactive';
export type TutorStatus = 'pending' | 'active' | 'rejected';

export interface StudentTable {
  id: string; // Document ID
  name: string; // Mandatory
  email: string; // Unique, Mandatory
  phone: string; // Unique, Mandatory
  password: string; // Mandatory
  class: string; // Mandatory
  board: string; // Mandatory
  avatar?: string;
  status: UserStatus; // Default: 'active'
  createdAt: Timestamp;
}

export interface TutorTable {
  id: string; // Document ID
  name: string; // Mandatory
  email: string; // Unique, Mandatory
  phone: string; // Unique, Mandatory
  password: string; // Mandatory
  qualification: string; // Mandatory
  experience: number; // Mandatory
  identityProof: string; // URL, Mandatory
  certificate?: string; // URL, Mandatory if experience >= 1
  demoVideo?: string; // URL
  avatar?: string;
  bio?: string;
  price?: number;
  rating: number; // Default: 0
  status: TutorStatus; // Default: 'pending'
  createdAt: Timestamp;
}
