import { Search, Calendar, BookOpen, Check, X, Clock, MessageSquare, Phone, AlertCircle, XCircle } from 'lucide-react';
import { Booking, BookingStatus, PageId, AvailabilitySlot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { RescheduleModal } from './RescheduleModal';

function parseTimeStr(t: string) {
  if (!t) return 0;
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let [_, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + parseInt(m, 10);
}

import { useAuthStore } from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import { useUIStore } from '../store/useUIStore';
import { useChatStore } from '../store/useChatStore';
import { useLiveClassStore } from '../store/useLiveClassStore';
import { bookingService } from '../services/bookingService';
import { chatService } from '../services/chatService';

import { useBookingListener } from '../hooks/useBookingListener';

export function Bookings() {
  // Activate isolated listener for booking updates
  useBookingListener();

  const profile = useAuthStore(state => state.profile);
  const { bookings, manualSlots, openRescheduleFor, setOpenRescheduleFor } = useBookingStore();
  const { setCurrentPage, searchTerm: globalSearchTerm, setSearchTerm: setGlobalSearchTerm } = useUIStore();
  const { setActiveChatId } = useChatStore();
  const [filter, setFilter] = useState<BookingStatus | 'All'>('All');
  const [localSearchTerm, setLocalSearchTerm] = useState(globalSearchTerm);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (openRescheduleFor) {
      const booking = bookings.find(b => b.id === openRescheduleFor);
      if (booking) {
        setSelectedBooking(booking);
        setRescheduleModalOpen(true);
      }
      setOpenRescheduleFor(null);
    }
  }, [openRescheduleFor, setOpenRescheduleFor, bookings]);

  const handleRescheduleClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleClose = () => {
    setRescheduleModalOpen(false);
    setSelectedBooking(null);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'All' 
      ? (b.status !== 'completed' && b.status !== 'cancelled')
      : b.status === filter;
    const name = b.name || '';
    const subject = b.subject || '';
    const matchesSearch = name.toLowerCase().includes(localSearchTerm.toLowerCase()) || 
                          subject.toLowerCase().includes(localSearchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleWhatsApp = (booking: Booking) => {
    if (!booking.studentPhone) {
      setError("No phone number available for this student.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    const name = booking.name || 'Student';
    const message = encodeURIComponent(`Hi ${name}, this is your tutor regarding our ${booking.subject || 'session'}.`);
    window.open(`https://wa.me/${booking.studentPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="page-title">Bookings</h1>
        <div className="flex items-center bg-white border border-surface-variant px-3 py-1.5 rounded-lg w-full max-w-sm shadow-sm focus-within:ring-2 ring-primary transition-all">
          <Search className="w-5 h-5 text-primary mr-3" />
          <input 
            className="bg-transparent border-none focus:ring-0 secondary-text w-full placeholder:text-slate-400 outline-none font-medium" 
            placeholder="Search student or subject..." 
            type="text"
            value={localSearchTerm}
            onChange={(e) => {
              setLocalSearchTerm(e.target.value);
              setGlobalSearchTerm(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-surface-variant w-max shadow-sm">
        {['All', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl transition-all font-bold text-xs capitalize",
              filter === f ? "bg-primary text-white shadow-md" : "text-on-surface-variant hover:bg-slate-50"
            )}
          >
            {f === 'completed' ? 'Conducted' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredBookings.filter(b => {
             if (filter === 'completed') {
               return b.status === 'completed' && b.tutorJoined && b.studentJoined && b.topic && (b.durationConducted === undefined || b.durationConducted >= 2);
             }
             return true;
          }).map((booking) => (
            <motion.div
              layout
              key={booking.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-surface-variant atelier-card-shadow flex flex-col group hover:-translate-y-1 transition-all duration-300 w-full overflow-hidden"
            >
              <div className="flex gap-2 md:gap-3 mb-3 md:mb-4 items-center min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-base md:text-lg shrink-0 border-2 border-white ring-2 ring-primary/5 overflow-hidden">
                  {booking.studentAvatar ? (
                    <img src={booking.studentAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (booking.name || (booking as any).studentName || 'S').split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <h5 className="font-black text-sm md:text-base text-on-surface truncate">{booking.name || (booking as any).studentName || 'Student'}</h5>
                    <span className={cn(
                      "px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest shrink-0 border border-black/5",
                      booking.status === 'pending' ? "bg-amber-100 text-amber-600" : 
                      booking.status === 'paid' ? "bg-emerald-100 text-emerald-600 border-emerald-200" :
                      booking.status === 'confirmed' ? "bg-primary/10 text-primary" : 
                      booking.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {booking.status === 'completed' ? 'Conducted' : booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[8px] md:text-[9px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md inline-block truncate max-w-full">
                      {booking.subject || 'General Session'}
                    </span>
                    <span className="text-[7px] md:text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-widest border border-blue-100">
                      {booking.type === 'demo' ? 'Demo' : 'Regular'}
                    </span>
                    {booking.duration && (
                      <span className="text-[7px] md:text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md uppercase tracking-widest border border-amber-100">
                        {booking.duration}
                      </span>
                    )}
                    {(booking as any).plan && (
                      <span className="text-[7px] md:text-[8px] font-black bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-widest border border-slate-100">
                        {(booking as any).plan}
                      </span>
                    )}
                  </div>
                    {(booking.status === 'completed' || booking.attendance_status) && booking.attendance_status && (
                        <span className={cn(
                          "text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block uppercase tracking-widest",
                          booking.attendance_status === 'attended' || booking.attendance_status === 'pending'
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                        )}>
                          {booking.attendance_status === 'not_attended' ? 'Not Attended' : booking.attendance_status === 'not_conducted' ? 'Not Conducted' : 'Attended'}
                        </span>
                      )}
                    {booking.topic && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1 italic line-clamp-1">Topic: {booking.topic}</p>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">Date</p>
                    <p className="text-[11px] font-bold text-on-surface">{booking.date}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">Time ({booking.duration})</p>
                    <p className="text-[11px] font-bold text-on-surface">
                      {booking.status === 'completed' && booking.durationConducted && booking.durationConducted > 14 ? (
                        <span className="text-emerald-600">Conducted ({booking.durationConducted}m)</span>
                      ) : (
                        (() => {
                           const today = new Date().toISOString().split('T')[0];
                           if (booking.rescheduledDays?.[today]) return `${booking.rescheduledDays[today]} (Today)`;
                           return booking.time;
                         })()
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl mb-4 border-l-4 border-primary italic text-[10px] text-on-surface line-clamp-1">
                "{booking.message || 'No additional message provided.'}"
              </div>

              {(() => {
                const now = new Date();
                
                // Construct robust date objects for comparison
                const [year, month, day] = booking.date.includes('-') 
                  ? booking.date.split('-').map(Number)
                  : [now.getFullYear(), now.getMonth(), now.getDate()];
                
                const isoToday = now.toISOString().split('T')[0];
                const actualTime = (booking.rescheduledDays?.[isoToday]) || booking.time;
                
                const timeMatch = actualTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                let hours = 0, minutes = 0;
                if (timeMatch) {
                  let [_, h, m, ampm] = timeMatch;
                  hours = parseInt(h);
                  minutes = parseInt(m);
                  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }

                const sessionStart = new Date(year, month - 1, day, hours, minutes);
                const durationHrs = parseFloat(booking.duration || '1');
                const sessionEnd = new Date(sessionStart.getTime() + durationHrs * 60 * 60 * 1000);
                const isPast = now > sessionEnd;
                const isToday = now.toDateString() === sessionStart.toDateString();
                const diffMs = sessionStart.getTime() - now.getTime();
                const diffMins = diffMs / (60 * 1000);
                
                const courseEndDate = booking.courseEndDate ? (booking.courseEndDate.toMillis ? booking.courseEndDate.toMillis() : new Date(booking.courseEndDate).getTime()) : null;
                const isCourseEnded = courseEndDate && now.getTime() > courseEndDate;
                const isWithinCourseRange = (booking as any).plan === 'course' && now >= sessionStart && (!courseEndDate || now.getTime() <= courseEndDate);

                const isActive = (now >= new Date(sessionStart.getTime() - 10 * 60 * 1000) && now <= sessionEnd) || isWithinCourseRange;

                return (
                  <div className="mt-auto space-y-2">
                    {(booking.status === 'pending' || booking.status === 'paid') && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button 
                          onClick={() => bookingService.updateStatus(booking.id.toString(), 'confirmed', profile?.name || 'Tutor', booking)}
                          className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/90 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button 
                          onClick={async () => {
                            await bookingService.updateStatus(booking.id.toString(), 'cancelled', profile?.name || 'Tutor', booking);
                            handleRescheduleClick(booking); 
                          }}
                          className="flex-1 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-[10px] hover:bg-red-100 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject & Reschedule
                        </button>
                      </div>
                    )}
                  
                    <div className="flex gap-2">
                      {(() => {
                        const canReschedule = now.getTime() <= (sessionStart.getTime() + 10 * 60 * 1000) || 
                                             (isPast && (booking.attendance_status === 'not_attended' || booking.attendance_status === 'not_conducted'));
                        
                        return canReschedule && (
                          <button 
                            onClick={() => handleRescheduleClick(booking)}
                            className="flex-1 bg-white border border-surface-variant text-on-surface font-bold py-2.5 rounded-xl text-[10px] hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Clock className="w-3.5 h-3.5" /> Reschedule
                          </button>
                        );
                      })()}
                    </div>

                    {booking.status === 'confirmed' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={async () => {
                              if (!profile?.id) return;
                              const chatId = `${profile.id}_${booking.studentEmail.replace(/\./g, '_')}`;
                              const studentName = booking.name || (booking as any).studentName || 'Student';
                              await chatService.initializeChat(chatId, profile.id, profile.name, profile.avatar || '', booking.studentEmail, studentName);
                              setActiveChatId(chatId);
                              setCurrentPage('chat');
                            }}
                            className="flex-1 bg-primary/5 text-primary font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </button>
                          {isCourseEnded ? (
                            <button 
                              disabled
                              className="flex-1 bg-rose-50 text-rose-600 font-bold py-2.5 rounded-xl text-[10px] cursor-not-allowed border border-rose-100 flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Course Ended
                            </button>
                          ) : isActive ? (
                            <button 
                              onClick={() => setCurrentPage('live-class')}
                              className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 animate-pulse"
                            >
                              <Clock className="w-3.5 h-3.5" /> Join Class
                            </button>
                          ) : !isPast && (
                            <div className="flex-1 bg-slate-50 text-slate-400 font-bold py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 border border-slate-100 italic">
                              <Clock className="w-3.5 h-3.5" /> {
                                (isToday && diffMins > 10) ? 'Session Not Started' : 'Upcoming'
                              }
                            </div>
                          )}
                        </div>
                        
                        {isPast && (
                          <div className="flex flex-col gap-2 w-full mt-1">
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => bookingService.updateAttendance(booking.id.toString(), 'attended', 'completed')}
                                className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-[10px] hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" /> Conducted
                              </button>
                              <button 
                                onClick={() => bookingService.updateAttendance(booking.id.toString(), 'not_attended', 'completed')}
                                className="flex-1 bg-rose-50 text-rose-600 font-bold py-2.5 rounded-xl text-[10px] hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Student Missed
                              </button>
                              <button 
                                onClick={() => bookingService.updateAttendance(booking.id.toString(), 'not_conducted', 'completed')}
                                className="flex-1 bg-slate-100 text-slate-600 font-bold py-2.5 rounded-xl text-[10px] hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Not Conducted
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleModalOpen && selectedBooking && (
          <RescheduleModal
            booking={selectedBooking}
            allBookings={bookings}
            availability={manualSlots}
            onClose={handleRescheduleClose}
            onConfirm={async (id, date, time, msg, scope) => {
              await bookingService.reschedule(id.toString(), date, time, profile?.name || 'Tutor', selectedBooking, scope);
              handleRescheduleClose();
            }}
          />
        )}
      </AnimatePresence>
      {/* Inline Toast Notification */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest z-[100] flex items-center gap-3 border border-rose-400"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
