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
  activeChatId: localStorage.getItem('tutor_active_chat_id'),
  chatMessages: [],
  studentProfiles: {},
  setContacts: (contacts) => set((state) => ({ 
    contacts: typeof contacts === 'function' ? contacts(state.contacts) : contacts 
  })),
  setActiveChatId: (activeChatId) => set((state) => {
    const nextId = typeof activeChatId === 'function' ? activeChatId(state.activeChatId) : activeChatId;
    if (nextId) localStorage.setItem('tutor_active_chat_id', nextId);
    else localStorage.removeItem('tutor_active_chat_id');
    return { activeChatId: nextId };
  }),
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
