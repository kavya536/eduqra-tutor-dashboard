import { create } from 'zustand';
import { ChatContact, Message } from '../types';

interface ChatState {
  contacts: ChatContact[];
  activeChatId: string | null;
  chatMessages: Message[];
  studentProfiles: Record<string, any>;
  setContacts: (contacts: ChatContact[] | ((prev: ChatContact[]) => ChatContact[])) => void;
  setActiveChatId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setChatMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setStudentProfiles: (profiles: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  updateStudentProfile: (email: string, profile: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  contacts: [],
  activeChatId: null,
  chatMessages: [],
  studentProfiles: {},
  setContacts: (contacts) => set((state) => ({ 
    contacts: typeof contacts === 'function' ? contacts(state.contacts) : contacts 
  })),
  setActiveChatId: (activeChatId) => set((state) => ({ 
    activeChatId: typeof activeChatId === 'function' ? activeChatId(state.activeChatId) : activeChatId 
  })),
  setChatMessages: (chatMessages) => set((state) => ({ 
    chatMessages: typeof chatMessages === 'function' ? chatMessages(state.chatMessages) : chatMessages 
  })),
  setStudentProfiles: (studentProfiles) => set((state) => ({ 
    studentProfiles: typeof studentProfiles === 'function' ? studentProfiles(state.studentProfiles) : studentProfiles 
  })),
  updateStudentProfile: (email, profile) => set((state) => ({
    studentProfiles: { ...state.studentProfiles, [email]: profile }
  })),
}));
