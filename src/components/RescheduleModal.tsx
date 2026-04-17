import { Calendar, Clock, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { Booking, AvailabilitySlot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface RescheduleModalProps {
  booking: Booking;
  allBookings: Booking[];
  availability: AvailabilitySlot[];
  onClose: () => void;
  onConfirm: (id: any, newDate: string, newTime: string) => Promise<void>;
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
      const windowStart = parseTimeStr(availSlot.start);
      const windowEnd = parseTimeStr(availSlot.end);
      if (!windowStart || !windowEnd || windowEnd <= windowStart) continue;

      for (let time = windowStart; time <= windowEnd - requiredDurationMins; time += 30) {
        // Don't show past times if today
        if (isToday && time < currentMins + 30) continue;

        const slotEnd = time + requiredDurationMins;

        // Check for conflicts with existing bookings
        const hasConflict = dayBookings.some(b =>
          (time < b.end && slotEnd > b.start)
        );

        if (!hasConflict) {
          slots.push(formatMins(time));
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
      await onConfirm(booking.id, selectedDate, selectedTime);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/75"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-3xl border border-white/20 overflow-hidden mt-2 md:mt-6 max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]"
      >
        <div className="p-5 md:p-6 overflow-y-auto max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">Reschedule Session</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update Appointment</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors shrink-0">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-2xl p-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</span>
              <p className="text-sm font-bold text-slate-800 mt-2">{booking.name || 'Scholar Student'}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 md:col-span-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Timing</span>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-2">
                <Clock size={14} className="text-primary shrink-0" /> {new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} @ {booking.time}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6 bg-amber-50 rounded-2xl border border-amber-100 p-4">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</span>
              <p className="text-sm font-bold text-primary mt-2">{booking.subject}</p>
            </div>
            <div className="flex gap-3 items-start md:max-w-[260px]">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                Student will be notified immediately of the new time.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">1. Select New Date</label>
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
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
                        "flex flex-col items-center justify-center min-w-[70px] py-4 rounded-3xl border-2 transition-all shrink-0",
                        isSelected 
                          ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-primary/30"
                      )}
                    >
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mb-1">
                        {i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-black">{d.getDate()}</span>
                      <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">2. Select New Time Slot</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "py-4 px-6 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-center gap-2",
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
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                  <X size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No Available Slots Found</p>
                  {hasMatchingAvailabilityWindow && (
                    <p className="mt-2 text-[10px] font-bold text-amber-600">
                      Availability exists, but no slot can fit this class duration ({Math.round(bookingDurationMins / 60 * 10) / 10}h).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3.5 text-xs font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!selectedTime || isSubmitting}
              className={cn(
                "flex-[1.4] py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3",
                selectedTime && !isSubmitting
                  ? "bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95" 
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Check size={18} /> Confirm New Timing
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
