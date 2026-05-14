import { Calendar, Clock, X, Check, Loader2, AlertCircle, BookOpen, XCircle } from 'lucide-react';
import { Booking, AvailabilitySlot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface RescheduleModalProps {
  booking: Booking;
  allBookings: Booking[];
  availability: AvailabilitySlot[];
  onClose: () => void;
  onConfirm: (id: any, newDate: string, newTime: string, message?: string, scope?: 'one-day' | 'full-course') => Promise<void>;
}

export function RescheduleModal({ booking, allBookings, availability, onClose, onConfirm }: RescheduleModalProps) {
  const getLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateStr(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [rescheduleScope, setRescheduleScope] = useState<'one-day' | 'full-course'>('one-day');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [hasMatchingAvailabilityWindow, setHasMatchingAvailabilityWindow] = useState(false);

  // Function to parse "HH:MM AM/PM" or "HH:MM" to minutes from midnight
  const parseTimeStr = (t: string) => {
    if (!t) return 0;
    const twentyFourHour = t.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHour) {
      const hours = parseInt(twentyFourHour[1], 10);
      const mins = parseInt(twentyFourHour[2], 10);
      if (Number.isNaN(hours) || Number.isNaN(mins)) return 0;
      return (hours * 60) + mins;
    }
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, h, m, ampm] = match;
    let hours = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(m, 10);
  };

  // Function to format minutes to "HH:MM AM/PM"
  const formatMins = (m: number) => {
    let h = Math.floor(m / 60);
    const mm = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
  };

  const bookingDurationMins = (() => {
    const parsed = parseFloat((booking.duration || '1').toString());
    return Number.isFinite(parsed) && parsed > 0 ? parsed * 60 : 60;
  })();

  useEffect(() => {
    if (!selectedDate) return;
    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    const selectedDay = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const requiredDurationMins = bookingDurationMins;

    // 1. Get all confirmed/pending bookings for this date (excluding the one we are rescheduling)
    const dayBookings = allBookings
      .filter(b => b.date === selectedDate && b.status !== 'cancelled' && b.id !== booking.id)
      .map(b => {
        const start = parseTimeStr(b.time);
        const durationHrs = parseFloat(b.duration || '1');
        return { start, end: start + (durationHrs * 60) };
      })
      .sort((a, b) => a.start - b.start);

    // 2. Filter tutor availability for this selected date/day.
    const matchingAvailability = (availability || []).filter(slot => {
      const matchesDate = !!slot.date && slot.date === selectedDate;
      const matchesDay = !!slot.day && slot.day === selectedDay;
      // Date-specific slots should match exact date; weekly slots should match day.
      return matchesDate || (!slot.date && matchesDay) || matchesDay;
    });
    setHasMatchingAvailabilityWindow(matchingAvailability.length > 0);

    // 3. Generate possible start slots from tutor's free windows.
    const slots: string[] = [];
    const now = new Date();
    const isToday = selectedDate === getLocalDateStr(now);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (const availSlot of matchingAvailability) {
      const startMins = parseTimeStr(availSlot.start);
      const endMins = parseTimeStr(availSlot.end);
      
      // Generate sub-slots every 10 minutes within the window
      for (let slotStartMins = startMins; slotStartMins <= endMins - requiredDurationMins; slotStartMins += 10) {
        const slotEndMins = slotStartMins + requiredDurationMins;
        const slotTimeStr = formatMins(slotStartMins);

        // Rule 1: Must be in the future (if today)
        if (isToday && slotStartMins < currentMins + 30) continue;

        // Rule 2: Must not conflict with tutor's other bookings
        const hasConflict = dayBookings.some(b =>
          (slotStartMins < b.end && slotEndMins > b.start)
        );

        if (!hasConflict) {
          slots.push(slotTimeStr);
        }
      }
    }

    const uniqueSorted = Array.from(new Set(slots)).sort((a, b) => parseTimeStr(a) - parseTimeStr(b));
    setAvailableSlots(uniqueSorted);
  }, [selectedDate, allBookings, booking.id, bookingDurationMins, availability]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      await onConfirm(booking.id, selectedDate, selectedTime, message, rescheduleScope);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Reschedule Session</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update Student Appointment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 shadow-inner">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</span>
              <p className="text-sm font-bold text-slate-800 mt-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                {booking.name || 'Scholar Student'}
              </p>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 shadow-inner">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Timing</span>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-2">
                <Clock size={14} className="text-primary shrink-0" /> 
                {new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} @ {booking.time}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <BookOpen size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest">Subject</span>
                <p className="text-sm font-black text-amber-900 mt-0.5">{booking.subject}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center md:max-w-[280px] bg-white/50 p-3 rounded-xl">
              <AlertCircle className="text-amber-500 shrink-0" size={16} />
              <p className="text-[9px] font-bold text-amber-700 leading-tight">
                Student will receive an instant notification about this change.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Reschedule Scope Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Select Reschedule Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRescheduleScope('one-day')}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1 group",
                    rescheduleScope === 'one-day' 
                      ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                      : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                  )}
                >
                  <div className={cn("p-2 rounded-lg transition-colors", rescheduleScope === 'one-day' ? "bg-white/20" : "bg-primary/10")}>
                    <Clock size={18} className={rescheduleScope === 'one-day' ? "text-white" : "text-primary"} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider mt-2">Single Session</span>
                  <span className={cn("text-[8px] font-bold opacity-60", rescheduleScope === 'one-day' ? "text-white" : "text-slate-400")}>Update only for {selectedDate}</span>
                </button>
                <button
                  onClick={() => setRescheduleScope('full-course')}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1 group",
                    rescheduleScope === 'full-course' 
                      ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                      : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                  )}
                >
                  <div className={cn("p-2 rounded-lg transition-colors", rescheduleScope === 'full-course' ? "bg-white/20" : "bg-primary/10")}>
                    <Calendar size={18} className={rescheduleScope === 'full-course' ? "text-white" : "text-primary"} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider mt-2">Entire Course</span>
                  <span className={cn("text-[8px] font-bold opacity-60", rescheduleScope === 'full-course' ? "text-white" : "text-slate-400")}>Update all future classes</span>
                </button>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Choose New Date</label>
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar px-1">
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const dateStr = getLocalDateStr(d);
                  const isSelected = selectedDate === dateStr;
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime('');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[75px] py-5 rounded-[1.5rem] border-2 transition-all shrink-0",
                        isSelected 
                          ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110 z-10" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-primary/30"
                      )}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1.5">
                        {i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-base font-black">{d.getDate()}</span>
                      <span className="text-[9px] font-bold uppercase mt-0.5">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Pick Available Time</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "py-4 px-4 rounded-2xl border-2 text-[11px] font-black transition-all flex items-center justify-center gap-2",
                        selectedTime === time 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-primary/20"
                      )}
                    >
                      <Clock size={14} className={selectedTime === time ? "text-white" : "text-primary/40"} />
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-16 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center bg-slate-50/50">
                  <XCircle size={32} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No matching slots available</p>
                  {hasMatchingAvailabilityWindow && (
                    <p className="mt-3 text-[10px] font-bold text-amber-600 max-w-[240px] mx-auto leading-relaxed">
                      Your availability windows exist, but none can fit this session duration ({Math.round(bookingDurationMins / 60 * 10) / 10}h).
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Message to Student */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Reason for Rescheduling (Optional)</label>
              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 text-sm font-bold outline-none focus:border-primary/30 focus:bg-white transition-all min-h-[120px] shadow-inner"
                placeholder="Write a brief message to the student..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50 flex gap-4 bg-white shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
          >
            Discard
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedTime || isSubmitting}
            className={cn(
              "flex-[1.5] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
              selectedTime && !isSubmitting
                ? "bg-primary text-white shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95" 
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Check size={18} />
                Finalize New Schedule
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
