import { Bell, User, Settings, LogOut, ChevronDown, Menu, BookOpen, MessageSquare, Star, Check, CalendarClock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { PageId, TutorNotification } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TopBarProps {
  onPageChange: (page: PageId) => void;
  onToggleSidebar?: () => void;
  onLogout: () => void;
  notifications: TutorNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

const notifIconMap = {
  booking: <BookOpen className="w-4 h-4 text-primary" />,
  message: <MessageSquare className="w-4 h-4 text-sky-500" />,
  review:  <Star className="w-4 h-4 text-amber-500" />,
};

const notifBgMap = {
  booking: 'bg-primary/10',
  message: 'bg-sky-50',
  review:  'bg-amber-50',
};

export function TopBar({ onPageChange, onToggleSidebar, onLogout, notifications, onMarkAllRead, onMarkRead }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen]     = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(event.target as Node))   setIsNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 right-0 w-full z-40 bg-background/80 backdrop-blur-3xl shadow-sm border-b border-surface-variant/50 flex justify-between items-center px-4 md:px-10 py-3 md:py-4 transition-all gap-2 md:gap-4">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <div className="font-black text-primary text-lg md:text-xl truncate font-display tracking-tighter">Eduqra Dashboard</div>
      </div>

      <div className="flex items-center gap-2 md:gap-6 shrink-0">

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative text-primary bg-primary/5 hover:bg-primary/10 p-2 md:p-2.5 rounded-xl transition-all active:scale-95 group border border-primary/10"
          >
            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-background flex items-center justify-center px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-4 w-[340px] bg-white rounded-3xl shadow-2xl border border-surface-variant/50 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-surface-variant/50 flex justify-between items-center bg-slate-50/70">
                  <div>
                    <h4 className="font-black text-sm tracking-tight">Notifications</h4>
                    {unreadCount > 0 && (
                      <p className="text-[10px] font-bold text-primary mt-0.5">{unreadCount} unread</p>
                    )}
                  </div>
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        layout
                        onClick={() => onMarkRead(notif.id)}
                        className={cn(
                          'p-4 cursor-pointer transition-colors group flex items-start gap-3',
                          notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', notifBgMap[notif.type])}>
                          {notifIconMap[notif.type]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-xs font-bold leading-snug', notif.read ? 'text-on-surface' : 'text-on-surface font-black')}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">{notif.description}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <CalendarClock className="w-3 h-3 text-slate-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{notif.time}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                    <button
                      onClick={() => { onPageChange('bookings'); setIsNotifOpen(false); }}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                      View all bookings →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-4 pl-6 border-l border-surface-variant/50 cursor-pointer group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-on-surface group-hover:text-primary transition-colors font-display tracking-tight">Alex Johnson</p>
              <p className="label-caps opacity-60">Premium Tutor</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all">
              AJ
            </div>
            <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-500', isProfileOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-[calc(100%+10px)] right-0 w-56 bg-white rounded-2xl shadow-xl border border-surface-variant py-2 z-[100] overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-surface-variant mb-1">
                  <p className="font-black text-primary text-sm">Tutor Account</p>
                  <p className="text-[10px] text-on-surface-variant font-bold">alex.j@eduqra.com</p>
                </div>
                <button onClick={() => { onPageChange('profile'); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/5 text-xs font-bold flex items-center gap-3 transition-colors">
                  <User className="w-4 h-4 text-primary" /> Profile
                </button>
                <button onClick={() => { onPageChange('settings'); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/5 text-xs font-bold flex items-center gap-3 transition-colors">
                  <Settings className="w-4 h-4 text-primary" /> Settings
                </button>
                <div className="h-[1px] bg-surface-variant my-1 mx-2"></div>
                <button onClick={() => { onLogout(); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center gap-3 transition-colors">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
