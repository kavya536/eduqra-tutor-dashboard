import { Clock, AlertCircle, CheckCircle2, BookOpen, Video, Plus, Edit2, Trash2, X, XCircle, Save, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { AvailabilitySlot, Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

interface AvailabilityProps {
  slots: AvailabilitySlot[];
  bookings: Booking[];
  onAddSlot: (slot: Omit<AvailabilitySlot, 'id'>) => void;
  onDeleteSlot: (id: number) => void;
  onEditSlot: (id: number, updatedSlot: Partial<AvailabilitySlot>) => void;
  onBatchAddSlots: (slots: Omit<AvailabilitySlot, 'id'>[]) => void;
  onClearSlots: () => void;
}

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
  if (parts.length < 2) return t; // Return as is if not HH:MM format

  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return t;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatMins(m: number) {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

function durationLabel(start: string, end: string) {
  if (!start || !end) return '';
  
  const parseToMins = (timeStr: string) => {
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let [_, h, m, ampm] = match;
        let hours = parseInt(h, 10);
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return hours * 60 + parseInt(m, 10);
      }
    }
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const sMins = parseToMins(start);
  let eMins = parseToMins(end);
  
  // If end time is before start time, assume it's the next day
  if (eMins < sMins) {
    eMins += 24 * 60;
  }
  
  const mins = eMins - sMins;
  
  if (mins === 0) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseTime(timeStr: string) {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
    return 0;
  }
  let [_, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  return hours * 60 + parseInt(m, 10);
}

function getSlotMins(t: string) {
  return parseTime(t);
}

export function Availability({ slots, bookings, onAddSlot, onDeleteSlot, onEditSlot, onBatchAddSlots, onClearSlots }: AvailabilityProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<AvailabilitySlot> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  
  const getWeekData = (offset: number) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    return dayOrder.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = new Date().toDateString() === d.toDateString();
      return {
        name: name,
        date: d.toISOString().split('T')[0],
        displayDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        isToday
      };
    });
  };

  const currentWeekDays = getWeekData(weekOffset);
  const weekRangeLabel = `${currentWeekDays[0].displayDate} - ${currentWeekDays[currentWeekDays.length - 1].displayDate}`;

  const activeBookings = bookings.filter(b => ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status));

  const totalDemos = activeBookings.filter(b => b.type === 'demo').length;
  const totalRegular = activeBookings.filter(b => b.type === 'paid').length;

  const visibleSlotsByDay: Record<string, any[]> = {};

  currentWeekDays.forEach(dayInfo => {
    const dayName = dayInfo.name;
    const dateStr = dayInfo.date;
    
    // Find relevant bookings for this day to check for conflicts
    const dayBookings = activeBookings.filter(b => {
      if (!b.date) return false;
      try {
        const bDate = b.date.includes('-') ? b.date : new Date(b.date).toISOString().split('T')[0];
        return bDate === dateStr;
      } catch (e) {
        return false;
      }
    });

    const processed: any[] = [];
    
    // Process manual slots and check for bookings within them
    const daySlotsRaw = slots.filter(s => s.day?.toLowerCase() === dayName.toLowerCase());
    daySlotsRaw.forEach(s => {
      const sStartMins = parseTime(s.start);
      const sEndMins = parseTime(s.end);

      // Expand into 1-hour intervals
      for (let m = sStartMins; m < sEndMins; m += 60) {
        const slotTimeStr = formatMins(m);
        
        // Check if this specific hour is covered by a booking
        const booking = dayBookings.find(b => {
          const bStart = parseTime(b.time);
          const bDurMatch = b.duration?.toString().match(/([\d.]+)/);
          const bDurMins = bDurMatch ? parseFloat(bDurMatch[1]) * 60 : 60;
          return m >= bStart && m < (bStart + bDurMins);
        });

        processed.push({
          ...s,
          start: slotTimeStr,
          end: formatMins(m + 60),
          type: 'custom',
          displayStatus: booking ? (booking.status === 'pending' ? 'pending' : (booking.type === 'demo' ? 'demo' : 'regular')) : 'free',
          booked: !!booking,
          studentName: booking?.studentName || booking?.name,
          subject: booking?.subject
        });
      }
    });

    if (processed.length) {
      visibleSlotsByDay[dateStr] = processed.sort((a, b) => getSlotMins(a.start) - getSlotMins(b.start));
    }
  });

  const allVisibleSlots = Object.values(visibleSlotsByDay).flat();

  const handleOpenAdd = () => {
    const todayDate = new Date().toISOString().split('T')[0];
    const d = new Date();
    const dayName = dayOrder[d.getDay() === 0 ? 6 : d.getDay() - 1];
    setCurrentSlot({ day: dayName, date: todayDate, start: '09:00', end: '10:00', status: 'free' });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot: any) => {
    setCurrentSlot(slot);
    setEditId(slot.type === 'auto' ? null : slot.id);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentSlot?.day || !currentSlot?.start || !currentSlot?.end) {
      alert("Please fill all fields");
      return;
    }
    const sVal = currentSlot.start;
    const eVal = currentSlot.end;
    if (sVal >= eVal) {
      alert("End time must be after start time");
      return;
    }
    if (editId) {
      onEditSlot(editId, currentSlot);
    } else {
      onAddSlot(currentSlot as Omit<AvailabilitySlot, 'id'>);
    }
    setIsModalOpen(false);
    setEditId(null);
  };

  return (
    <>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Availability & Schedule</h1>
          <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-0.5">
            Manage your free slots and view your session timeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-amber-500/20 transition-all cursor-default group"
            >
              <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:rotate-12 transition-transform">
                <Video size={14} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/60 leading-none">Demo Sessions</span>
                <span className="text-lg font-black text-amber-700 leading-none mt-1">{totalDemos}</span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-rose-500/20 transition-all cursor-default group"
            >
              <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:rotate-12 transition-transform">
                <BookOpen size={14} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600/60 leading-none">Regular Sessions</span>
                <span className="text-lg font-black text-rose-700 leading-none mt-1">{totalRegular}</span>
              </div>
            </motion.div>
          </div>
          
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Plus size={16} /> Add Free Slot
          </button>
        </div>
      </div>

      {allVisibleSlots.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        {currentWeekDays.map((dayInfo) => {
          const daySlots = visibleSlotsByDay[dayInfo.date] || [];
          const color = dayColors[dayInfo.name];
          
          return (
            <motion.div
              key={dayInfo.date}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex-shrink-0 w-[240px] flex flex-col rounded-[2rem] border overflow-hidden bg-white shadow-sm transition-all hover:shadow-xl",
                dayInfo.isToday ? "border-primary/40 ring-4 ring-primary/5" : "border-slate-100"
              )}
            >
              <div className={cn("p-4 border-b flex flex-col gap-0.5 relative", color.bg, color.border)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.1em]", color.label)}>
                    {dayInfo.name}
                  </span>
                  {dayInfo.isToday && (
                    <span className="bg-primary text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                       Today
                    </span>
                  )}
                </div>
                <span className="text-lg font-black text-slate-800 tracking-tight">
                  {dayInfo.displayDate}
                </span>
                {dayInfo.isToday && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"></div>}
              </div>

              <div className={cn("flex-1 p-2.5 space-y-2 min-h-[350px] overflow-y-auto max-h-[500px] scrollbar-hide bg-slate-50/30", daySlots.length === 0 && "flex items-center justify-center")}>
                {daySlots.length > 0 ? (
                  daySlots.map((slot) => (
                    <motion.div
                      key={slot.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "relative p-2.5 rounded-[1.2rem] border transition-all cursor-default",
                        slot.displayStatus === 'pending' ? "bg-amber-50/30 border-amber-100/50 opacity-90" : 
                        slot.displayStatus === 'demo' ? "bg-amber-50/50 border-amber-100 opacity-80" : 
                        slot.displayStatus === 'regular' ? "bg-rose-50/50 border-rose-100 opacity-80" : 
                        slot.displayStatus === 'busy' ? "bg-slate-100 border-slate-200" :
                        "bg-white border-slate-100 hover:border-primary/30 hover:shadow-md hover:scale-[1.02]"
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                             <span className={cn(
                               "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                               slot.displayStatus === 'pending' ? "bg-amber-100 text-amber-700 border border-amber-200" : 
                               slot.displayStatus === 'demo' ? "bg-amber-500 text-white" : 
                               slot.displayStatus === 'regular' ? "bg-rose-500 text-white" : 
                               slot.displayStatus === 'busy' ? "bg-slate-700 text-white" :
                               "bg-emerald-500 text-white"
                             )}>
                               {slot.displayStatus}
                             </span>
                           {!slot.booked && slot.type === 'custom' && (
                             <div className="flex items-center gap-1">
                               <button 
                                 onClick={() => handleOpenEdit(slot)}
                                 className="p-1 hover:bg-primary/10 rounded-md text-primary transition-all"
                               >
                                 <Edit2 size={10} />
                               </button>
                               <button 
                                 onClick={() => onDeleteSlot(slot.id)}
                                 className="p-1 hover:bg-rose-50 rounded-md text-red-500 transition-all"
                               >
                                 <Trash2 size={10} />
                               </button>
                             </div>
                           )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-0.5 h-6 rounded-full bg-primary"
                          )} />
                          <div className="flex flex-col gap-0">
                            <span className="text-[10px] font-black text-slate-800 leading-none">
                               {formatTime(slot.start)} – {formatTime(slot.end)}
                            </span>
                            {(slot.displayStatus === 'demo' || slot.displayStatus === 'regular' || slot.displayStatus === 'pending') ? (
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                 {slot.subject} with {slot.studentName}
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-tighter mt-0.5">
                                 Open for Booking
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center opacity-10">
                    <Clock size={20} className="mb-1" />
                    <span className="text-[8px] font-black uppercase tracking-widest">No Slots</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {allVisibleSlots.length === 0 && (
        <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-primary/20 max-w-4xl mx-auto">
          <Calendar className="w-16 h-16 text-primary/20 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-on-surface mb-2">No confirmed classes yet</h3>
          <p className="text-sm text-on-surface-variant font-bold opacity-60 mb-8 max-w-sm mx-auto">
            Once you accept a booking request from a student, the session will appear here in your weekly timeline.
          </p>
        </div>
      )}

    </div>

    {/* Slot Modal */}
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800">
                {editId ? 'Edit Slot' : 'Add Free Slot'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Day</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none appearance-none"
                  value={currentSlot?.day || ''}
                  onChange={(e) => setCurrentSlot({...currentSlot, day: e.target.value})}
                >
                  {dayOrder.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                    value={currentSlot?.start || ''}
                    onChange={(e) => setCurrentSlot({...currentSlot, start: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                    value={currentSlot?.end || ''}
                    onChange={(e) => setCurrentSlot({...currentSlot, end: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Save Slot
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
