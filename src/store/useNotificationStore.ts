import { create } from 'zustand';
import { TutorNotification } from '../types';

interface NotificationState {
  notifications: TutorNotification[];
  setNotifications: (notifications: TutorNotification[] | ((prev: TutorNotification[]) => TutorNotification[])) => void;
  addNotification: (notification: Omit<TutorNotification, 'id' | 'read' | 'time'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set((state) => ({ 
    notifications: typeof notifications === 'function' ? notifications(state.notifications) : notifications 
  })),
  addNotification: (notif) => set((state) => ({ 
    notifications: [
      {
        ...notif,
        id: `notif-${Date.now()}`,
        read: false,
        time: 'Just now',
      } as TutorNotification,
      ...state.notifications
    ] 
  })),
  markRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
}));
