import { Clock, AlertCircle, CheckCircle2, BookOpen, Plus, Edit2, Trash2, X, Save, Calendar } from 'lucide-react';
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
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let [_, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + parseInt(m, 10);
}

function getSlotMins(t: string) {
  if (!t) return 0;
  const [h,m] = t.split(':').map(Number);
  return h*60 + m;
}

export function Availability({ slots, bookings, onAddSlot, onDeleteSlot, onEditSlot }: AvailabilityProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<AvailabilitySlot> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // ── derived ──
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');

  const visibleSlots = slots.map(slot => {
    const isBooked = activeBookings.some(b => {
      const bDate = new Date(b.date);
      const bDayStr = dayOrder[bDate.getDay() === 0 ? 6 : bDate.getDay() - 1];
      if (bDayStr !== slot.day) return false;

      const bStartMins = parseTime(b.time);
      const durMatch = b.duration.match(/([\d.]+)/);
      const bDurMins = durMatch ? parseFloat(durMatch[1]) * 60 : 60;
      const bEndMins = bStartMins + bDurMins;

      const sStartMins = getSlotMins(slot.start);
      const sEndMins = getSlotMins(slot.end);

      return bStartMins < sEndMins && bEndMins > sStartMins;
    });

    return { ...slot, booked: isBooked };
  });

  const slotsByDay = dayOrder.reduce<Record<string, AvailabilitySlot[]>>((acc, d) => {
    const ds = visibleSlots.filter(s => s.day === d).sort((a, b) => a.start.localeCompare(b.start));
    if (ds.length) acc[d] = ds;
    return acc;
  }, {});

  const totalFree   = visibleSlots.filter(s => !s.booked).length;
  const totalBooked = visibleSlots.filter(s => s.booked).length;

  const handleOpenAdd = () => {
    const todayDate = new Date().toISOString().split('T')[0];
    setCurrentSlot({ day: todayName, date: todayDate, start: '09:00', end: '10:00' });
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot: AvailabilitySlot) => {
    setCurrentSlot(slot);
    setEditId(slot.id);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentSlot?.day || !currentSlot?.start || !currentSlot?.end) {
      alert("Please fill all fields");
      return;
    }

    // Strict 9 AM - 7 PM Validation
    const sVal = currentSlot.start;
    const eVal = currentSlot.end;
    
    if (sVal < "09:00" || sVal > "19:00" || eVal < "09:00" || eVal > "19:00") {
      alert("Working hours are strictly restricted to 9:00 AM – 7:00 PM.");
      return;
    }

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

  // ── render ──
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Page Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Availability</h1>
          <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-0.5">
            Manage your weekly teaching schedule — students book from your free slots.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-black text-green-700">{totalFree} Free Slots</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              <BookOpen className="w-3 h-3 text-red-600" />
              <span className="text-[11px] font-black text-red-700">{totalBooked} Booked</span>
            </div>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Slot
          </button>
        </div>
      </div>

      {/* ── 1. FREE TIMINGS OVERVIEW (interactive) ── */}
      {visibleSlots.length > 0 && (
        <div className="bg-white border border-surface-variant rounded-2xl p-6 shadow-sm max-w-6xl overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-extrabold text-base text-on-surface">Your Free Timings This Week</h3>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                <span className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Free</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                <span className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Booked</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {dayOrder.map(day => {
              const daySlots = slotsByDay[day] || [];
              const isToday = day === todayName;
              
              return (
                <div key={day} className="flex flex-col h-full">
                  <div className={cn(
                    "mb-3 p-3 rounded-xl border-2 text-center transition-all",
                    isToday ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 border-slate-100 text-on-surface"
                  )}>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                      {isToday ? 'Today' : day.substring(0,3)}
                    </p>
                    <p className="font-black text-sm">{day}</p>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    {daySlots.length > 0 ? daySlots.map(slot => (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "group relative p-3 rounded-[1.5rem] border-2 transition-all cursor-default",
                          slot.booked ? "bg-red-50/50 border-red-100" : "bg-white border-slate-100 hover:border-primary/50 hover:shadow-md"
                        )}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              slot.booked ? "text-red-600" : "text-primary"
                            )}>
                              {slot.booked ? 'Booked' : 'Open'}
                            </span>
                            {!slot.booked && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleOpenEdit(slot)}
                                  className="p-1 hover:bg-primary/10 rounded-md text-primary transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => onDeleteSlot(slot.id)}
                                  className="p-1 hover:bg-red-50 rounded-md text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1 h-8 rounded-full",
                              slot.booked ? "bg-red-200" : "bg-primary/20"
                            )} />
                            <div>
                              <p className="text-[11px] font-black text-on-surface leading-tight">
                                {formatTime(slot.start)} – {formatTime(slot.end)}
                              </p>
                              {slot.date && (
                                <p className="text-[10px] font-bold text-primary/60">
                                  {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                              <p className="text-[10px] font-bold text-on-surface-variant opacity-60">
                                {durationLabel(slot.start, slot.end)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="h-20 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center px-4">No Slots</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No slots banner */}
      {visibleSlots.length === 0 && (
        <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-primary/20 max-w-4xl mx-auto">
          <Clock className="w-16 h-16 text-primary/20 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-on-surface mb-2">No availability set yet</h3>
          <p className="text-sm text-on-surface-variant font-bold opacity-60 mb-8 max-w-sm mx-auto">
            Click the button below to start building your weekly teaching timeline. Students will choose sessions from these times.
          </p>
          <button 
            onClick={handleOpenAdd}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20"
          >
            Add My First Slot
          </button>
        </div>
      )}

      {/* ── Slot Edit/Add Modal ── */}
      <AnimatePresence>
        {isModalOpen && currentSlot && (
          <div className="fixed inset-0 z-[110] flex flex-col items-center justify-start p-4 md:p-10 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-3xl p-5 border border-slate-100 overflow-y-auto max-h-[95vh] mt-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800">{editId ? 'Edit Slot' : 'Create New Slot'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-sans">
                {/* Date selection block */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Choose Date</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {(() => {
                      const dates = [];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date();
                        d.setDate(d.getDate() + i);
                        dates.push(d.toISOString().split('T')[0]);
                      }
                      return (
                        <>
                          {dates.map((date, idx) => {
                            const d = new Date(date + 'T00:00:00');
                            const isSelected = currentSlot.date === date;
                            const label = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                            
                            return (
                              <button
                                key={date}
                                onClick={() => {
                                  const dayName = dayOrder[d.getDay() === 0 ? 6 : d.getDay() - 1];
                                  setCurrentSlot({ ...currentSlot, date, day: dayName });
                                }}
                                className={cn(
                                  "py-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-0.5",
                                  isSelected 
                                    ? "bg-primary border-primary text-white shadow-md" 
                                    : "bg-slate-50 border-slate-50 text-slate-600 hover:border-primary/20"
                                )}
                              >
                                <span className="text-[6px] font-bold uppercase tracking-tighter opacity-70">{label}</span>
                                <span className="text-[10px] font-bold">{d.getDate()}</span>
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-2">
                    <input
                      type="date"
                      value={currentSlot.date || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const d = new Date(e.target.value + 'T00:00:00');
                        const dayName = dayOrder[d.getDay() === 0 ? 6 : d.getDay() - 1];
                        setCurrentSlot({ ...currentSlot, date: e.target.value, day: dayName });
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 focus:ring-1 ring-primary outline-none"
                    />
                  </div>
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Start Time</label>
                  <input 
                    type="time" 
                    value={currentSlot.start || '09:00'}
                    min="09:00"
                    max="19:00"
                    onChange={(e) => {
                      const newStart = e.target.value;
                      // Recalculate end time if a duration was previously selected
                      if (currentSlot.end && currentSlot.start) {
                        const [sh, sm] = currentSlot.start.split(':').map(Number);
                        const [eh, em] = currentSlot.end.split(':').map(Number);
                        const prevDurMins = (eh * 60 + em) - (sh * 60 + sm);
                        if (prevDurMins > 0) {
                          const [nsh, nsm] = newStart.split(':').map(Number);
                          const newEndMins = nsh * 60 + nsm + prevDurMins;
                          const newEndH = Math.floor(newEndMins / 60);
                          const newEndM = newEndMins % 60;
                          if (newEndH <= 19) {
                            const newEnd = `${String(newEndH).padStart(2,'0')}:${String(newEndM).padStart(2,'0')}`;
                            setCurrentSlot({...currentSlot, start: newStart, end: newEnd});
                            return;
                          }
                        }
                      }
                      setCurrentSlot({...currentSlot, start: newStart});
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 ring-primary" 
                  />
                </div>

                {/* Duration Selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Duration</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: '1h',    mins: 60  },
                      { label: '1.5h',  mins: 90  },
                      { label: '2h',    mins: 120 },
                      { label: '2.5h',  mins: 150 },
                      { label: '3h',    mins: 180 },
                    ].map(({ label, mins }) => {
                      // Compute what end time would be
                      const [sh, sm] = (currentSlot.start || '09:00').split(':').map(Number);
                      const endTotal = sh * 60 + sm + mins;
                      const endH = Math.floor(endTotal / 60);
                      const endM = endTotal % 60;
                      const computedEnd = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
                      const isDisabled = endH > 19 || (endH === 19 && endM > 0);
                      // Check if this duration is currently selected
                      const [curEH, curEM] = (currentSlot.end || '').split(':').map(Number);
                      const curDur = currentSlot.start
                        ? (curEH * 60 + curEM) - (sh * 60 + sm)
                        : -1;
                      const isSelected = curDur === mins;

                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) setCurrentSlot({...currentSlot, end: computedEnd});
                          }}
                          className={cn(
                            "py-2 rounded-lg border-2 text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5",
                            isDisabled
                              ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400"
                              : isSelected
                              ? "bg-primary border-primary text-white shadow-md"
                              : "bg-slate-50 border-slate-50 text-slate-600 hover:border-primary/30 hover:bg-primary/5"
                          )}
                        >
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Show computed end time */}
                  {currentSlot.end && (
                    <p className="text-[9px] font-bold text-slate-400 text-right">
                      Ends at <span className="text-primary font-black">{formatTime(currentSlot.end)}</span>
                    </p>
                  )}
                </div>

                  <div className={cn(
                    "flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-lg border",
                    currentSlot.start && currentSlot.end && durationLabel(currentSlot.start, currentSlot.end).includes('h') && parseInt(durationLabel(currentSlot.start, currentSlot.end)) >= 6
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-primary/5 border-primary/10 text-primary"
                  )}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-bold">
                      {currentSlot.date ? new Date(currentSlot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} | {formatTime(currentSlot.start!)} – {formatTime(currentSlot.end!)}
                      {currentSlot.start && currentSlot.end && (
                        <span className="ml-2 font-black opacity-60">
                          ({durationLabel(currentSlot.start, currentSlot.end)})
                          {(() => {
                            const startM = currentSlot.start.split(':').map(Number);
                            const endM = currentSlot.end.split(':').map(Number);
                            const sTot = startM[0] * 60 + startM[1];
                            const eTot = endM[0] * 60 + endM[1];
                            return eTot < sTot ? <span className="ml-1 text-[8px] uppercase tracking-tighter text-red-500 underline ml-2">Next Day</span> : null;
                          })()}
                        </span>
                      )}
                    </p>
                  </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-[10px] font-black text-on-surface-variant hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[10px] shadow-xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" /> {editId ? 'Update' : 'Confirm Slot'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
