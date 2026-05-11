import { Clock, AlertCircle, CheckCircle2, BookOpen, Video, Plus, Edit2, Trash2, X, XCircle, Save, Calendar, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { AvailabilitySlot, Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState, useEffect, useMemo } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useBookingStore } from '../store/useBookingStore';
import { authService } from '../services/authService';

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dayColors: Record<string, { bg: string; border: string; dot: string; label: string; freeBg: string }> = {
  Monday:    { bg: 'bg-violet-50',  border: 'border-violet-200', dot: 'bg-violet-500',  label: 'text-violet-700',  freeBg: 'bg-violet-100'  },
  Tuesday:   { bg: 'bg-sky-50',     border: 'border-sky-200',    dot: 'bg-sky-500',     label: 'text-sky-700',     freeBg: 'bg-sky-100'     },
  Wednesday: { bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', label: 'text-emerald-700', freeBg: 'bg-emerald-100' },
  Thursday:  { bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500',   label: 'text-amber-700',   freeBg: 'bg-amber-100'   },
  Friday:    { bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    label: 'text-rose-700',    freeBg: 'bg-rose-100'    },
  Saturday:  { bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  label: 'text-orange-700',  freeBg: 'bg-orange-100'  },
  Sunday:    { bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-500',    label: 'text-pink-700',    freeBg: 'bg-pink-100'    },
};

const todayName = dayOrder[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

function formatTime(t: string) {
  if (!t) return '';
  // Handle cases where time is already formatted (e.g., "09:00 AM")
  if (t.includes('AM') || t.includes('PM')) return t;
  
  const parts = t.split(':');
  if (parts.length < 2) return t; 

  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return t;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatMins(m: number) {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = (h % 24) >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTime(t: string) {
  if (!t) return 0;
  const ampmMatch = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampmMatch) {
    let [_, h, m, ampm] = ampmMatch;
    let hours = parseInt(h);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(m);
  }
  const parts = t.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  return 0;
}

export function Availability() {
  const { profile } = useAuthStore();
  const { manualSlots: slots, bookings } = useBookingStore();
  
  const tutorId = profile?.id || '';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<AvailabilitySlot> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  
  const getWeekData = (offset: number) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Start exactly from Today + offset * 7
    const start = new Date(now);
    start.setDate(now.getDate() + (offset * 7));

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isToday = new Date().toDateString() === d.toDateString();
      const name = dayOrder[d.getDay() === 0 ? 6 : d.getDay() - 1];
      return {
        name: name,
        date: formatDateLocal(d),
        displayDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        isToday
      };
    });
  };

  const currentWeekDays = useMemo(() => getWeekData(weekOffset), [weekOffset]);
  const weekRangeLabel = `${currentWeekDays[0].displayDate} - ${currentWeekDays[currentWeekDays.length - 1].displayDate}`;

  // Mini Calendar Logic for Date Picker
  const [calendarDate, setCalendarDate] = useState(new Date());
  const calendarDays = useMemo(() => {
    const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const days = [];
    const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon-based
    
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i));
    }
    return days;
  }, [calendarDate]);

  const visibleSlotsByDay = useMemo(() => {
    const slotsByDay: Record<string, any[]> = {};
    const activeBookings = bookings.filter(b => ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status));

    const normalizeDate = (d: any) => {
      if (!d) return '';
      if (typeof d === 'string' && d.includes('-')) return d;
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return String(d);
      }
    };

    currentWeekDays.forEach(dayInfo => {
      const dateStr = dayInfo.date;
      
      const dayBookingsRaw = activeBookings.filter(b => {
        if (!b.date) return false;
        return normalizeDate(b.date) === dateStr;
      });

      // De-duplicate bookings for the same student at the same time just in case of DB redundancy
      const dayBookings: Booking[] = [];
      const seen = new Set<string>();
      dayBookingsRaw.forEach(b => {
        const key = `${b.time}-${b.studentName || b.name || b.studentEmail}`;
        if (!seen.has(key)) {
          dayBookings.push(b);
          seen.add(key);
        }
      });
      
      const processed: any[] = [];

      // 1. First, add all unique bookings for this day as slots
      dayBookings.forEach(booking => {
        processed.push({
          id: `booking-${booking.id}`,
          start: booking.time,
          end: booking.time, // Display start time
          displayStatus: booking.status,
          booked: true,
          studentName: booking.studentName || booking.name,
          subject: booking.subject,
          bookingId: booking.id,
          bookingType: (booking as any)?.type || 'paid',
          bookingTime: booking.time
        });
      });

      // 2. Add manual slots ONLY if they are NOT already occupied by a booking
      const daySlotsRaw = slots.filter(s => normalizeDate(s.date) === dateStr);
      
      daySlotsRaw.forEach(s => {
        const sStartMins = parseTime(s.start);
        const sEndMins = parseTime(s.end);

        // Split into hourly blocks for the UI grid
        for (let m = sStartMins; m < sEndMins; m += 60) {
          const slotTimeStr = formatMins(m);
          const slotEndMins = m + 60;

          // Check if this specific hour is covered by any booking
          const isOccupied = dayBookings.some(b => {
            const bStart = parseTime(b.time);
            const bDurMatch = b.duration?.toString().match(/([\d.]+)/);
            const bDurMins = bDurMatch ? parseFloat(bDurMatch[1]) * 60 : 60;
            const bEnd = bStart + bDurMins;
            // Conflict if ranges overlap
            return m < bEnd && slotEndMins > bStart;
          });

          if (!isOccupied) {
            processed.push({
              ...s,
              id: `${s.id}-${m}`, // Unique ID for this hour block
              start: slotTimeStr,
              end: formatMins(slotEndMins),
              displayStatus: 'free',
              booked: false
            });
          }
        }
      });

      if (processed.length) {
        slotsByDay[dateStr] = processed.sort((a, b) => parseTime(a.start) - parseTime(b.start));
      }
    });
    return slotsByDay;
  }, [currentWeekDays, slots, bookings]);

  const allVisibleSlots = useMemo(() => Object.values(visibleSlotsByDay).flat(), [visibleSlotsByDay]);
  const activeBookings = bookings.filter(b => ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status));
  const totalDemos = activeBookings.filter(b => b.type === 'demo').length;
  const totalRegular = activeBookings.filter(b => b.type === 'paid').length;
  const totalPending = activeBookings.filter(b => b.status === 'pending').length;
  const totalConfirmed = activeBookings.filter(b => b.status === 'confirmed').length;
  
  // Count only genuinely free slots currently visible in the 7-day view
  const totalFreeSlotsCount = allVisibleSlots.filter(s => !s.booked).length;

  const handleOpenAdd = () => {
    const today = new Date();
    const dayName = dayOrder[today.getDay() === 0 ? 6 : today.getDay() - 1];
    setCurrentSlot({ 
      day: dayName, 
      date: formatDateLocal(today),
      start: '09:00', 
      end: '10:00', 
      status: 'free' 
    });
    setEditId(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentSlot?.day || !currentSlot?.start || !currentSlot?.end) {
      setError("Please fill all fields");
      return;
    }
    const sVal = parseTime(currentSlot.start);
    const eVal = parseTime(currentSlot.end);
    if (sVal >= eVal) {
      setError("End time must be after start time");
      return;
    }

    const isDuplicate = slots.some(s => 
      s.date === currentSlot.date && 
      s.start === currentSlot.start && 
      s.id !== editId
    );

    if (isDuplicate) {
      setError(`A slot at this time already exists for ${currentSlot.date}.`);
      return;
    }

    setError(null);
    setIsSaving(true);
    
    let updatedSlots = [...slots];
    if (editId) {
      updatedSlots = updatedSlots.map(s => s.id === editId ? { ...s, ...currentSlot } : s);
    } else {
      updatedSlots.push({ ...currentSlot, id: Date.now() } as AvailabilitySlot);
    }

    authService.updateAvailability(tutorId, updatedSlots)
      .then(() => {
        setIsModalOpen(false);
        setIsSaving(false);
        setEditId(null);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to save slot");
        setIsSaving(false);
      });
  };

  const handleDeleteSlot = (id: number) => {
    if (!confirm("Remove this availability slot?")) return;
    const updatedSlots = slots.filter(s => s.id !== id);
    authService.updateAvailability(tutorId, updatedSlots);
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="text-primary" size={20} />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Availability Center</h1>
            </div>
            <p className="text-xs font-bold text-slate-500 opacity-80">
              Manage your teaching hours and track your upcoming sessions.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 flex items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 min-w-[120px] text-center">
                  {weekRangeLabel}
                </span>
              </div>
              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-2 hover:bg-white rounded-lg transition-all text-slate-600 shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={16} /> Add Slot
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Bookings', value: totalPending, icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50/50', desc: 'Waiting for your approval' },
            { label: 'Confirmed Sessions', value: totalConfirmed, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', desc: 'Accepted classes' },
            { label: 'Demo Classes', value: totalDemos, icon: Video, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'New student trials' },
            { label: 'Regular Classes', value: totalRegular, icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Paid student sessions' }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5, scale: 1.02, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
              className={cn("p-4 rounded-3xl border border-white shadow-sm flex items-center gap-4 transition-all duration-300", stat.bg)}
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{stat.label}</p>
                <p className={cn("text-xl font-black leading-none mt-1", stat.color)}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {currentWeekDays.map((dayInfo) => {
            const daySlots = visibleSlotsByDay[dayInfo.date] || [];
            
            return (
              <div
                key={dayInfo.date}
                className={cn(
                  "flex flex-col rounded-[2.5rem] border transition-all bg-white min-h-[450px] shadow-sm",
                  dayInfo.isToday ? "border-primary/30 ring-4 ring-primary/5 bg-primary/[0.01]" : "border-slate-100"
                )}
              >
                <div className={cn("p-5 border-b flex flex-col items-center justify-center relative rounded-t-[2.5rem]", dayInfo.isToday ? "bg-primary/10" : "bg-slate-50/30")}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">
                    {dayInfo.name.substring(0, 3)}
                  </span>
                  <span className={cn("text-lg font-black leading-none", dayInfo.isToday ? "text-primary" : "text-slate-800")}>
                    {dayInfo.displayDate.split(' ')[0]}
                  </span>
                  {dayInfo.isToday && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#004AAD]" />
                  )}
                </div>

                  <div className="flex-1 p-3 space-y-3">
                    {daySlots.length > 0 ? (
                      daySlots.map((slot) => (
                        <motion.div
                          key={`${slot.id}-${slot.start}`}
                          whileHover={{ y: -4, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "group relative p-2.5 rounded-[1.5rem] border transition-all cursor-pointer",
                            slot.displayStatus === 'pending' ? "bg-amber-50 border-amber-100 hover:shadow-amber-100/50 text-amber-900" : 
                            slot.displayStatus === 'confirmed' ? "bg-emerald-600 border-emerald-500 text-white shadow-md hover:shadow-emerald-500/40" :
                            slot.displayStatus === 'live' ? "bg-rose-600 border-rose-500 text-white shadow-md hover:shadow-rose-500/40" :
                            "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 hover:shadow-emerald-100/30 text-slate-800"
                          )}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                slot.booked 
                                  ? (slot.displayStatus === 'pending' ? "bg-amber-200 text-amber-950" : "bg-white/20 text-white") 
                                  : "bg-emerald-100 text-emerald-700"
                              )}>
                                {slot.booked 
                                  ? (slot.displayStatus === 'pending' ? 'Slot Booked' : 'Book Confirmed') 
                                  : 'Free Slot'}
                              </span>
                              {!slot.booked && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded-lg text-rose-500 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <p className={cn("text-[10px] font-black leading-none flex items-center gap-1", 
                                slot.booked ? (slot.displayStatus === 'pending' ? "text-amber-900" : "text-white") : "text-slate-800"
                              )}>
                                <Clock size={10} />
                                {slot.booked && slot.bookingTime ? slot.bookingTime : formatTime(slot.start)}
                              </p>
                              {slot.booked ? (
                                <div className="mt-1.5 pt-1.5 border-t border-current/10 space-y-1">
                                  <p className={cn("text-[10px] font-black truncate leading-tight", 
                                    slot.displayStatus === 'pending' ? "text-amber-950" : "text-white"
                                  )}>{slot.studentName}</p>
                                  <div className="flex flex-col gap-1">
                                    <p className={cn("text-[8px] font-bold truncate uppercase tracking-tight opacity-70", 
                                      slot.displayStatus === 'pending' ? "text-amber-900" : "text-white"
                                    )}>{slot.subject}</p>
                                    <div className="flex flex-wrap gap-1">
                                      <span className={cn("text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block w-fit", 
                                        slot.displayStatus === 'pending' ? "text-amber-700 bg-amber-600/10" : "text-white bg-white/20"
                                      )}>
                                        {slot.bookingType === 'demo' ? 'Demo Class' : 'Regular Class'}
                                      </span>
                                      {slot.displayStatus === 'live' && (
                                        <span className="text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block w-fit bg-white text-rose-600 animate-pulse">
                                          Live Now
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter pl-3.5">Available</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                      <Clock size={20} className="mb-2" />
                      <span className="text-[8px] font-black uppercase tracking-widest">No Slots</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modern Slot Modal with Calendar Date Picker */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl overflow-visible"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editId ? 'Edit Session' : 'Add Free Slot'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 mb-2"
                  >
                    <AlertCircle size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                  </motion.div>
                )}

                {/* Custom Date Picker Section */}
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block ml-1">Appointment Date</label>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={cn(
                      "w-full bg-slate-50/80 border-2 rounded-2xl py-4 px-5 text-left flex items-center justify-between group transition-all",
                      showDatePicker ? "border-primary/30 ring-4 ring-primary/5 bg-white shadow-sm" : "border-transparent hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-11 h-11 rounded-xl shadow-sm flex items-center justify-center transition-all duration-300",
                        showDatePicker ? "bg-primary text-white scale-110" : "bg-white text-primary"
                      )}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-900 leading-none mb-1">
                          {currentSlot?.date ? new Date(currentSlot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a date'}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Click to toggle calendar</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className={cn("text-slate-300 transition-transform duration-500", showDatePicker && "rotate-90 text-primary")} />
                  </button>

                  <AnimatePresence>
                    {showDatePicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.98 }}
                        className="absolute left-0 right-0 top-full mt-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.12)] p-6 z-50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-6 px-1">
                          <span className="text-base font-black text-slate-800 tracking-tight">
                            {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"><ChevronLeft size={18} /></button>
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"><ChevronRight size={18} /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 mb-3">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
                            <span key={d} className="text-[10px] font-black text-slate-300 text-center uppercase">{d}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {calendarDays.map((d, idx) => {
                            const isSelected = d && currentSlot?.date === formatDateLocal(d);
                            const isToday = d && new Date().toDateString() === d.toDateString();
                            
                            // Disable past dates
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const isPast = d && d < today;
                            
                            return (
                              <button
                                key={idx}
                                disabled={!d || isPast}
                                onClick={() => {
                                  if (d && !isPast) {
                                    const dayName = dayOrder[d.getDay() === 0 ? 6 : d.getDay() - 1];
                                    setCurrentSlot({...currentSlot, date: formatDateLocal(d), day: dayName});
                                    setShowDatePicker(false);
                                  }
                                }}
                                className={cn(
                                  "aspect-square w-full rounded-full text-xs font-black transition-all flex items-center justify-center relative",
                                  !d ? "opacity-0 cursor-default" : 
                                  isPast ? "text-slate-200 cursor-not-allowed opacity-40" :
                                  isSelected ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10" : 
                                  isToday ? "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20" : "hover:bg-slate-50 text-slate-600"
                                )}
                              >
                                {d?.getDate()}
                                {isToday && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_5px_rgba(0,74,173,0.5)]" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Start Time (AM/PM)</label>
                    <div className="relative group">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-300" size={18} />
                      <input 
                        type="time" 
                        className="w-full bg-slate-50/80 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-sm font-black outline-none transition-all"
                        value={currentSlot?.start || ''}
                        onChange={(e) => setCurrentSlot({...currentSlot, start: e.target.value})}
                      />
                      {currentSlot?.start && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                          <span className="text-[10px] font-black uppercase tracking-widest">{formatTime(currentSlot.start)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">End Time (AM/PM)</label>
                    <div className="relative group">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-300" size={18} />
                      <input 
                        type="time" 
                        className="w-full bg-slate-50/80 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-sm font-black outline-none transition-all"
                        value={currentSlot?.end || ''}
                        onChange={(e) => setCurrentSlot({...currentSlot, end: e.target.value})}
                      />
                      {currentSlot?.end && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                          <span className="text-[10px] font-black uppercase tracking-widest">{formatTime(currentSlot.end)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex-[2] py-5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3",
                      isSaving ? "bg-emerald-500 shadow-emerald-500/20" : "bg-[#004AAD] shadow-blue-500/30 hover:brightness-110 hover:-translate-y-1 active:translate-y-0 active:scale-95"
                    )}
                  >
                    {isSaving ? (
                      <><CheckCircle2 size={18} /> Session Saved</>
                    ) : (
                      <><Save size={18} /> Confirm Availability</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
