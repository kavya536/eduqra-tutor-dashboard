import { create } from 'zustand';

interface LiveClassState {
  activeMeetingId: string | null;
  sessionStatus: 'waiting' | 'connecting' | 'live' | 'disconnected';
  sessionStartTime: Date | null;
  sessionTimer: string;
  isMicOn: boolean;
  isCamOn: boolean;
  isLiveChatOpen: boolean;
  isScreenSharing: boolean;
  liveMessages: any[];
  talkingTime: number;
  sessionTopic: string;
  showTopicModal: boolean;
  showEndChoiceModal: boolean;
  pendingEndAction: 'complete' | 'reschedule' | null;

  setActiveMeetingId: (id: string | null) => void;
  setSessionStatus: (status: 'waiting' | 'connecting' | 'live' | 'disconnected' | ((prev: 'waiting' | 'connecting' | 'live' | 'disconnected') => 'waiting' | 'connecting' | 'live' | 'disconnected')) => void;
  setSessionStartTime: (time: Date | null) => void;
  setSessionTimer: (timer: string) => void;
  setIsMicOn: (on: boolean) => void;
  setIsCamOn: (on: boolean) => void;
  setIsLiveChatOpen: (open: boolean) => void;
  setIsScreenSharing: (sharing: boolean) => void;
  setLiveMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  setTalkingTime: (time: number) => void;
  setSessionTopic: (topic: string) => void;
  setShowTopicModal: (show: boolean) => void;
  setShowEndChoiceModal: (show: boolean) => void;
  setPendingEndAction: (action: 'complete' | 'reschedule' | null) => void;
}

export const useLiveClassStore = create<LiveClassState>((set) => ({
  activeMeetingId: null,
  sessionStatus: 'waiting',
  sessionStartTime: null,
  sessionTimer: "00:00:00",
  isMicOn: true,
  isCamOn: true,
  isLiveChatOpen: false,
  isScreenSharing: false,
  liveMessages: [],
  talkingTime: 0,
  sessionTopic: "",
  showTopicModal: false,
  showEndChoiceModal: false,
  pendingEndAction: null,

  setActiveMeetingId: (activeMeetingId) => set({ activeMeetingId }),
  setSessionStatus: (sessionStatus) => set((state) => ({ 
    sessionStatus: typeof sessionStatus === 'function' ? sessionStatus(state.sessionStatus) : sessionStatus 
  })),
  setSessionStartTime: (sessionStartTime) => set({ sessionStartTime }),
  setSessionTimer: (sessionTimer) => set({ sessionTimer }),
  setIsMicOn: (isMicOn) => set({ isMicOn }),
  setIsCamOn: (isCamOn) => set({ isCamOn }),
  setIsLiveChatOpen: (isLiveChatOpen) => set({ isLiveChatOpen }),
  setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setLiveMessages: (liveMessages) => set((state) => ({ 
    liveMessages: typeof liveMessages === 'function' ? liveMessages(state.liveMessages) : liveMessages 
  })),
  setTalkingTime: (talkingTime) => set({ talkingTime }),
  setSessionTopic: (sessionTopic) => set({ sessionTopic }),
  setShowTopicModal: (showTopicModal) => set({ showTopicModal }),
  setShowEndChoiceModal: (showEndChoiceModal) => set({ showEndChoiceModal }),
  setPendingEndAction: (pendingEndAction) => set({ pendingEndAction }),
}));
