import { Search, Calendar, BookOpen, Check, X, Clock, MessageSquare, Phone, AlertCircle } from 'lucide-react';
import { Booking, BookingStatus, PageId } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface BookingsProps {
  bookings: Booking[];
  onStatusChange: (id: number, status: BookingStatus) => void;
  onReschedule: (id: number, date: string, time: string) => void;
  onPageChange: (page: PageId) => void;
}

export function Bookings({ bookings, onStatusChange, onReschedule, onPageChange }: BookingsProps) {
  const [filter, setFilter] = useState<BookingStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'All' || b.status === filter;
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleWhatsApp = (booking: Booking) => {
    if (!booking.studentPhone) {
      alert("No phone number available for this student.");
      return;
    }
    const message = encodeURIComponent(`Hi ${booking.name}, this is your tutor regarding our ${booking.subject} session.`);
    window.open(`https://wa.me/${booking.studentPhone}?text=${message}`, '_blank');
  };

  const handleRescheduleSubmit = () => {
    if (rescheduleId && newDate && newTime) {
      onReschedule(rescheduleId, newDate, newTime);
      setRescheduleId(null);
      setNewDate('');
      setNewTime('');
    }
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-surface-variant w-max shadow-sm">
        {['All', 'pending', 'confirmed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl transition-all font-bold text-xs capitalize",
              filter === f ? "bg-primary text-white shadow-md" : "text-on-surface-variant hover:bg-slate-50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredBookings.map((booking) => (
            <motion.div
              layout
              key={booking.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-surface-variant atelier-card-shadow flex flex-col group hover:-translate-y-1 transition-all duration-300 w-full overflow-hidden"
            >
              <div className="flex gap-2 md:gap-3 mb-3 md:mb-4 items-center min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-base md:text-lg shrink-0 border-2 border-white ring-2 ring-primary/5">
                  {booking.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <h5 className="font-black text-sm md:text-base text-on-surface truncate">{booking.name}</h5>
                    <span className={cn(
                      "px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest shrink-0 border border-black/5",
                      booking.status === 'pending' ? "bg-amber-100 text-amber-600" : 
                      booking.status === 'confirmed' ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                    )}>
                      {booking.status}
                    </span>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-md inline-block mt-0.5 truncate max-w-full">
                    {booking.subject}
                  </span>
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
                    <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">Time</p>
                    <p className="text-[11px] font-bold text-on-surface">{booking.time}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl mb-4 border-l-4 border-primary italic text-[10px] text-on-surface line-clamp-1">
                "{booking.message}"
              </div>

              <div className="mt-auto space-y-2">
                {booking.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onStatusChange(booking.id, 'confirmed')}
                      className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/90 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button 
                      onClick={() => {
                        onStatusChange(booking.id, 'cancelled');
                        setRescheduleId(booking.id); // Proactively suggest rescheduling
                      }}
                      className="flex-1 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-[10px] hover:bg-red-100 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject & Reschedule
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setRescheduleId(booking.id)}
                    className="flex-1 bg-white border border-surface-variant text-on-surface font-bold py-2.5 rounded-xl text-[10px] hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" /> Reschedule
                  </button>
                  <button 
                    onClick={() => handleWhatsApp(booking)}
                    className="flex-1 bg-green-50 text-green-600 font-bold py-2.5 rounded-xl text-[10px] hover:bg-green-100 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                </div>

                {booking.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onPageChange('chat')}
                      className="flex-1 bg-primary/5 text-primary font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                    <button 
                      onClick={() => onPageChange('live-class')}
                      className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl text-[10px] hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                    >
                      <Clock className="w-3.5 h-3.5" /> Join Class
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleId && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-background rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-white">
                <h3 className="font-extrabold text-lg">Reschedule Session</h3>
                <button onClick={() => setRescheduleId(null)} className="text-on-surface-variant hover:text-red-500 transition-colors bg-slate-100 p-1.5 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                    The previous session was cancelled. Please select a new slot from your available timings to confirm a new class for this student.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider">Available Dates</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['2024-03-28', '2024-03-29', '2024-03-30', '2024-03-31'].map(date => (
                      <button 
                        key={date}
                        onClick={() => setNewDate(date)}
                        className={cn(
                          "p-2 rounded-xl text-[10px] font-bold border transition-all",
                          newDate === date ? "bg-primary text-white border-primary" : "bg-slate-50 border-slate-200 text-on-surface hover:border-primary/30"
                        )}
                      >
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider">Available Slots</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'].map(time => (
                      <button 
                        key={time}
                        onClick={() => setNewTime(time)}
                        className={cn(
                          "p-2 rounded-xl text-[10px] font-bold border transition-all",
                          newTime === time ? "bg-primary text-white border-primary" : "bg-slate-50 border-slate-200 text-on-surface hover:border-primary/30"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border-t border-surface-variant flex items-center justify-end gap-3">
                <button onClick={() => setRescheduleId(null)} className="text-xs font-bold px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button 
                  onClick={handleRescheduleSubmit}
                  className="bg-primary text-white font-bold px-6 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 text-xs"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
