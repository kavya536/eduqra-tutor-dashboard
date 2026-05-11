import { create } from 'zustand';
import { PageId } from '../types';

interface UIState {
  currentPage: PageId;
  isSidebarOpen: boolean;
  view: 'login' | 'register' | 'app';
  showLogoutConfirm: boolean;
  searchTerm: string;
  toast: { message: string, type: 'success' | 'error' } | null;
  setCurrentPage: (page: PageId) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setView: (view: 'login' | 'register' | 'app') => void;
  setShowLogoutConfirm: (show: boolean) => void;
  setSearchTerm: (term: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: (localStorage.getItem('tutor_current_page') as PageId) || 'dashboard',
  isSidebarOpen: false,
  view: 'login',
  showLogoutConfirm: false,
  searchTerm: '',
  toast: null,
  setCurrentPage: (currentPage) => {
    localStorage.setItem('tutor_current_page', currentPage);
    set({ currentPage });
  },
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setView: (view) => set({ view }),
  setShowLogoutConfirm: (showLogoutConfirm) => set({ showLogoutConfirm }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 4000);
  },
}));
