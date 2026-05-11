export interface PollData {
  question: string;
  options: string[];
  votes: Record<string, number[]>; // emailKey -> option indices
  allowMultiple: boolean;
  isAnonymous: boolean;
  expiresAt?: any;
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
  pollData?: PollData;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  senderName?: string;
  timestamp?: { seconds: number; nanoseconds: number } | any;
}

export interface ChatContact {
  id: string;
  name?: string;
  initials: string;
  online: boolean;
  unread: number;
  studentUnreadCount: number;
  messages: Message[];
  studentEmail?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  timestamp?: { seconds: number; nanoseconds: number } | null;
}
