import { create } from 'zustand';

interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  profileLoading: boolean;
  isReapplying: boolean;
  prefilledEmail: string;
  setUser: (user: any) => void;
  setProfile: (profile: any) => void;
  setLoading: (loading: boolean) => void;
  setProfileLoading: (loading: boolean) => void;
  setIsReapplying: (isReapplying: boolean) => void;
  setPrefilledEmail: (email: string) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  isReapplying: false,
  prefilledEmail: '',
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  setIsReapplying: (isReapplying) => set({ isReapplying }),
  setPrefilledEmail: (prefilledEmail) => set({ prefilledEmail }),
  reset: () => set({ user: null, profile: null, isReapplying: false, prefilledEmail: '', loading: false, profileLoading: false }),
}));
