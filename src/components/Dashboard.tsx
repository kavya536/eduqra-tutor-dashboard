import { Search, Library, Clock, XCircle, Plus, Wallet, BookOpen, MessageSquare, Calendar, Video, Lock } from 'lucide-react';
import { Booking, PageId, AvailabilitySlot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { RescheduleModal } from './RescheduleModal';

import { useAuthStore } from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import { useUIStore } from '../store/useUIStore';
import { useLiveClassStore } from '../store/useLiveClassStore';
import { useChatStore } from '../store/useChatStore';
import { bookingService } from '../services/bookingService';

import { useBookingListener } from '../hooks/useBookingListener';
import { useChatListener } from '../hooks/useChatListener';

export function Dashboard() {
  // Activate isolated listeners for dashboard content
  useBookingListener();
  useChatListener();

  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const bookings = useBookingStore(state => state.bookings);
  const manualSlots = useBookingStore(state => state.manualSlots);
  const setOpenRescheduleFor = useBookingStore(state => state.setOpenRescheduleFor);
  const setCurrentPage = useUIStore(state => state.setCurrentPage);
  const setSearchTerm = useUIStore(state => state.setSearchTerm);
  const setActiveMeetingId = useLiveClassStore(state => state.setActiveMeetingId);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const handleDashboardReschedule = (session: Booking) => {
    setOpenRescheduleFor(Number(session.id));
    setCurrentPage('bookings');
  };

  const stats = [
    { label: 'Total Sessions', value: bookings.length, icon: Library, color: 'bg-primary', textColor: 'text-white', filter: 'All' },
    { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'bg-white', textColor: 'text-secondary', filter: 'pending' },
    { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, icon: Calendar, color: 'bg-white', textColor: 'text-primary', filter: 'confirmed' },
    { label: 'Conducted', value: bookings.filter(b => b.status === 'completed' && b.tutorJoined && b.studentJoined && b.topic && (b.durationConducted === undefined || b.durationConducted >= 2)).length, icon: Library, color: 'bg-white', textColor: 'text-emerald-500', filter: 'completed' },
  ];

  const upcomingSessions = [...bookings]
    .filter(b => b.status === 'confirmed' || b.status === 'pending')
    .sort((a, b) => {
      try {
        const timeA = new Date(`${a.date} ${a.time}`).getTime();
        const timeB = new Date(`${b.date} ${b.time}`).getTime();
        return timeA - timeB;
      } catch (e) { return 0; }
    })
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="page-title mb-1">Dashboard</h1>
          <p className="font-medium secondary-text">Welcome back, {profile?.name || user?.displayName || 'Tutor'}. Here's what's happening today.</p>
        </div>
        
        <div className="flex items-center bg-white/80 backdrop-blur-3xl border border-white/30 px-6 py-4 rounded-3xl w-full lg:max-w-sm shadow-sm focus-within:ring-2 ring-primary/30 transition-all group">
          <Search className="w-5 h-5 text-primary mr-3 group-focus-within:scale-110 transition-transform" />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 outline-none font-bold" 
            placeholder="Search students name..." 
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchTerm((e.target as HTMLInputElement).value);
                setCurrentPage('bookings');
              }
            }}
          />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 md:gap-6">
        <button onClick={() => setCurrentPage('availability')} className="btn-primary text-[10px] md:text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 rounded-2xl px-6 md:px-8 py-3 md:py-4 flex-1 sm:flex-none">
          <Plus className="w-4 h-4" /> Availability
        </button>
        <button onClick={() => setCurrentPage('pricing')} className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] bg-white border border-surface-variant text-on-surface px-6 md:px-8 py-3 md:py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 flex-1 sm:flex-none">
          <Wallet className="w-4 h-4" /> Pricing
        </button>
        <button onClick={() => setCurrentPage('bookings')} className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] bg-white border border-surface-variant text-on-surface px-6 md:px-8 py-3 md:py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 flex-1 sm:flex-none">
          <BookOpen className="w-4 h-4" /> Bookings
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setCurrentPage('bookings')}
              className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
            >
              {/* Icon row — sits above everything */}
              <div className="flex justify-between items-center mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                  stat.label === 'Total Sessions' ? 'bg-primary/10 text-primary' :
                  stat.label === 'Pending' ? 'bg-amber-50 text-amber-600' :
                  stat.label === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                  'bg-emerald-50 text-emerald-600'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  {stat.label}
                </p>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">{stat.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upcoming Sessions */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white/80 backdrop-blur-3xl p-4 md:p-6 rounded-3xl md:rounded-4xl atelier-card-shadow border border-white/30"
      >
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-surface-variant/50 pb-4">
          <h2 className="subheading">Upcoming Sessions</h2>
          <button onClick={() => setCurrentPage('bookings')} className="label-caps text-primary hover:underline transition-all hover:tracking-tight">View All</button>
        </div>
        <div className="space-y-4 md:space-y-6">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map((session, i) => (
              <motion.div 
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 md:pb-8 border-b border-slate-50 last:border-0 gap-6 md:gap-10 hover:bg-slate-50/50 p-4 md:p-6 rounded-3xl transition-all group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/5 text-primary flex items-center justify-center font-black text-sm md:text-base shrink-0 border border-primary/10 overflow-hidden">
                    {session.studentAvatar ? (
                      <img src={session.studentAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (session.name || 'S').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h4 className="font-extrabold text-base text-on-surface truncate group-hover:text-primary transition-colors">{session.name}</h4>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        session.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                        session.status === 'rescheduled' ? "bg-blue-50 text-blue-600 border-blue-200" :
                        "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}>
                        {session.status}
                      </span>
                      {(session as any).type === 'demo' && (
                        <span className="px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-accent text-white shadow-sm">
                          Demo Class
                        </span>
                      )}
                    </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] font-bold text-on-surface-variant/60">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Library className="w-3.5 h-3.5 text-primary/40 shrink-0" /> 
                      <span className="truncate">{session.subject}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-on-surface font-black">
                      <Calendar className="w-3.5 h-3.5 text-primary/60 shrink-0" /> 
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-on-surface/80">
                      <Clock className="w-3.5 h-3.5 text-primary/40 shrink-0" /> 
                      {session.time}
                    </span>
                  </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 md:gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => handleDashboardReschedule(session)}
                    className="flex-1 sm:flex-none border border-surface-variant text-on-surface text-[10px] md:text-[11px] font-black uppercase tracking-widest px-5 md:px-7 py-2.5 md:py-3 rounded-2xl hover:bg-slate-50 hover:border-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                  >
                    <Clock className="w-4 h-4 text-primary transition-transform group-hover/btn:rotate-12" /> Reschedule
                  </button>

                  {(() => {
                    const isJoinable = () => {
                      try {
                        const now = new Date();
                        const sessionDate = new Date(`${session.date} ${session.time}`);
                        const diffMins = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
                        
                        const durationHrs = parseFloat(session.duration || '1');
                        const durationMins = durationHrs * 60;
                        const gracePeriodMins = 0; // Strictly active per end time for rejoin only
                        
                        const isPastSafetyWindow = now.getTime() > (sessionDate.getTime() + (durationMins + gracePeriodMins) * 60 * 1000);

                        if (isPastSafetyWindow) return false; // Hide if way past end time
                        
                        if (session.status === 'live') return true;
                        if (session.status !== 'confirmed') return false;
                        
                        // Joinable from 10 mins before start. 
                        return diffMins <= 10; 
                      } catch (e) {
                        return false;
                      }
                    };

                    if (isJoinable()) {
                      if (session.isSubscription && (session as any).subscriptionStatus === 'expired') {
                        return (
                          <div className="flex flex-col gap-2">
                             <button 
                                disabled
                                className="flex-1 sm:flex-none bg-slate-100 text-slate-400 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-5 md:px-7 py-2.5 md:py-3 rounded-2xl cursor-not-allowed opacity-50 border border-slate-200 flex items-center justify-center gap-2"
                              >
                                <Lock size={14} /> Payment Pending
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm('Are you sure you want to permanently cancel this expired subscription booking?')) {
                                    try {
                                      await bookingService.updateStatus(session.id.toString(), 'cancelled', user?.displayName || 'Tutor', session);
                                    } catch(e) { console.error(e); }
                                  }
                                }}
                                className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XCircle size={12} /> Permanently Cancel
                              </button>
                          </div>
                        );
                      }
                      return (
                        <button 
                          onClick={() => {
                            setActiveMeetingId(session.id.toString());
                            setCurrentPage('live-class');
                          }}
                          className={cn(
                            "flex-1 sm:flex-none text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest px-5 md:px-7 py-2.5 md:py-3 rounded-2xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg animate-pulse",
                            session.status === 'live' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-primary shadow-primary/20"
                          )}
                        >
                          <Video className="w-4 h-4" /> {session.status === 'live' ? 'Rejoin Class' : 'Join Class'}
                        </button>
                      );
                    } else if (session.status === 'confirmed') {
                      try {
                        const now = new Date();
                        const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                        const isToday = session.date === todayStr || session.date === isoToday;
                        const sessionDate = new Date(`${session.date} ${session.time}`);
                        const diffMins = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
                        
                        return (
                          <button 
                            disabled
                            className="flex-1 sm:flex-none bg-primary/10 text-primary/40 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-5 md:px-7 py-2.5 md:py-3 rounded-2xl cursor-not-allowed opacity-50"
                          >
                            {isToday && diffMins > 10 ? 'Session Not Started' : `Starts at ${session.time}`}
                          </button>
                        );
                      } catch (e) {
                         // Fallback
                      }
                      return (
                        <button 
                          disabled
                          className="flex-1 sm:flex-none bg-primary/10 text-primary/40 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-5 md:px-7 py-2.5 md:py-3 rounded-2xl cursor-not-allowed opacity-50"
                        >
                          Starts at {session.time}
                        </button>
                      );
                    }
                    return null;
                  })()}
                  
                  <button 
                    onClick={() => setCurrentPage('bookings')}
                    className="flex-1 sm:flex-none bg-slate-100 text-on-surface text-[10px] md:text-[11px] font-black uppercase tracking-widest px-6 md:px-8 py-2.5 md:py-3 rounded-2xl hover:bg-slate-200 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 md:py-16 text-on-surface-variant">
              <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto opacity-10 mb-4" />
              <p className="font-black text-base md:text-lg opacity-40 uppercase tracking-widest">No upcoming sessions found.</p>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {rescheduleModalOpen && selectedBooking && (
          <RescheduleModal
            booking={selectedBooking}
            allBookings={bookings}
            availability={manualSlots}
            onClose={() => {
              setRescheduleModalOpen(false);
              setSelectedBooking(null);
            }}
            onConfirm={async (id, date, time) => {
              await bookingService.reschedule(id.toString(), date, time, user?.displayName || 'Tutor', selectedBooking);
              setRescheduleModalOpen(false);
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
