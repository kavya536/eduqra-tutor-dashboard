import { Clock, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { AvailabilitySlot, Booking } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AvailabilityProps {
  slots: AvailabilitySlot[];
  bookings: Booking[];
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
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function durationLabel(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
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
  const [h,m] = t.split(':').map(Number);
  return h*60 + m;
}

export function Availability({ slots, bookings }: AvailabilityProps) {
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

  const freeByDay = dayOrder.reduce<Record<string, AvailabilitySlot[]>>((acc, d) => {
    const fs = (slotsByDay[d] || []).filter(s => !s.booked);
    if (fs.length) acc[d] = fs;
    return acc;
  }, {});

  const totalFree   = visibleSlots.filter(s => !s.booked).length;
  const totalBooked = visibleSlots.filter(s => s.booked).length;

  // ── render ──
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-on-surface tracking-tight">Availability</h2>
          <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-0.5">
            Manage your weekly teaching schedule — students book from your free slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[11px] font-black text-green-700">{totalFree} Free Slots</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
            <BookOpen className="w-3 h-3 text-red-600" />
            <span className="text-[11px] font-black text-red-700">{totalBooked} Booked</span>
          </div>
        </div>
      </div>

      {/* ── 1. FREE TIMINGS OVERVIEW (day-wise quick glance) ── */}
      {Object.keys(freeByDay).length > 0 && (
        <div className="bg-white border border-surface-variant rounded-2xl p-4 shadow-sm max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="font-black text-sm text-on-surface">Your Free Timings This Week</h3>
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">
              Today: {todayName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dayOrder.filter(d => freeByDay[d]).map(day => {
              const c = dayColors[day];
              const isToday = day === todayName;
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-xl border p-3 transition-all',
                    c.bg, c.border,
                    isToday && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-2 h-2 rounded-full', c.dot, isToday && 'animate-pulse')}></div>
                      <span className={cn('font-black text-xs', c.label)}>
                        {day} {isToday && <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full ml-1">Today</span>}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {freeByDay[day].length} slot{freeByDay[day].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {freeByDay[day].map(slot => (
                      <div key={slot.id} className={cn('flex items-center justify-between px-2.5 py-1 rounded-lg', c.freeBg)}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-2.5 h-2.5 text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-700">
                            {formatTime(slot.start)} – {formatTime(slot.end)}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-slate-500">{durationLabel(slot.start, slot.end)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* No free slots banner */}
      {Object.keys(freeByDay).length === 0 && visibleSlots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 max-w-4xl">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-bold text-amber-700">All your slots are currently booked by students.</p>
        </div>
      )}

    </div>
  );
}
