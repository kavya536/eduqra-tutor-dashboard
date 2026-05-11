import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { chatService } from '../services/chatService';

export function useChatListener() {
  const { profile } = useAuthStore();
  const { studentProfiles, setContacts } = useChatStore();

  useEffect(() => {
    if (!profile?.id) return;

    const unsub = chatService.subscribeToChats(profile.id, studentProfiles, (chatList) => {
      setContacts(prev => {
        return chatList.map(chat => {
          const existing = prev.find(p => p.id === chat.id);
          return { ...chat, messages: existing?.messages || [] };
        });
      });
    });

    return () => unsub();
  }, [profile?.id, studentProfiles, setContacts]);
}
