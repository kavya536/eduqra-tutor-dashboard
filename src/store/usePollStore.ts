import { create } from 'zustand';

interface PollState {
  polls: any[];
  setPolls: (polls: any[]) => void;
  addPoll: (poll: any) => void;
  removePoll: (id: string) => void;
}

export const usePollStore = create<PollState>((set) => ({
  polls: [],
  setPolls: (polls) => set({ polls }),
  addPoll: (poll) => set((state) => ({ polls: [poll, ...state.polls] })),
  removePoll: (id) => set((state) => ({ polls: state.polls.filter(p => p.id !== id) })),
}));
