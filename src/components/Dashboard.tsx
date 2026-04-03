import { Search, Library, Clock, CheckCircle, XCircle, Plus, Wallet, BookOpen, MessageSquare } from 'lucide-react';
import { Booking, PageId } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DashboardProps {
  bookings: Booking[];
  onPageChange: (page: PageId) => void;
  onSearch: (term: string) => void;
  user: any;
}

export function Dashboard({ bookings, onPageChange, onSearch, user }: DashboardProps) {
  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: Library, color: 'bg-primary', textColor: 'text-white', filter: 'All' },
    { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'bg-white', textColor: 'text-secondary', filter: 'pending' },
    { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, icon: CheckCircle, color: 'bg-white', textColor: 'text-tertiary', filter: 'confirmed' },
    { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, icon: XCircle, color: 'bg-white', textColor: 'text-red-500', filter: 'cancelled' },
  ];

  const upcomingSessions = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'pending')
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
          <p className="font-medium secondary-text">Welcome back, {user?.displayName || 'Tutor'}. Here's what's happening today.</p>
        </div>
        
        <div className="flex items-center bg-white/80 backdrop-blur-3xl border border-white/30 px-6 py-4 rounded-3xl w-full lg:max-w-sm shadow-sm focus-within:ring-2 ring-primary/30 transition-all group">
          <Search className="w-5 h-5 text-primary mr-3 group-focus-within:scale-110 transition-transform" />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 outline-none font-bold" 
            placeholder="Search students name..." 
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch((e.target as HTMLInputElement).value);
            }}
          />
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 md:gap-4">
        <button onClick={() => onPageChange('availability')} className="btn-primary text-[10px] md:text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 rounded-2xl px-6 md:px-8 py-3 md:py-4 flex-1 sm:flex-none">
          <Plus className="w-4 h-4" /> Availability
        </button>
        <button onClick={() => onPageChange('pricing')} className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] bg-white border border-surface-variant text-on-surface px-6 md:px-8 py-3 md:py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 flex-1 sm:flex-none">
          <Wallet className="w-4 h-4" /> Pricing
        </button>
        <button onClick={() => onPageChange('bookings')} className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] bg-white border border-surface-variant text-on-surface px-6 md:px-8 py-3 md:py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 flex-1 sm:flex-none">
          <BookOpen className="w-4 h-4" /> Bookings
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onPageChange('bookings')}
              className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2"
            >
              {/* Icon row — sits above everything */}
              <div className="flex justify-between items-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                  stat.label === 'Total Bookings' ? 'bg-blue-50 text-blue-600' :
                  stat.label === 'Pending' ? 'bg-amber-50 text-amber-600' :
                  stat.label === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-rose-50 text-rose-600'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{ fontSize: '10px', fontWeight: 600 }}>
                  ↗ +{12 - i * 2}%
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
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
          <button onClick={() => onPageChange('bookings')} className="label-caps text-primary hover:underline transition-all hover:tracking-tight">View All</button>
        </div>
        <div className="space-y-4 md:space-y-6">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map((session, i) => (
              <motion.div 
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 md:pb-6 border-b border-slate-50 last:border-0 gap-4 md:gap-6 hover:bg-slate-50/50 p-3 md:p-4 rounded-3xl transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-sm text-on-surface truncate">{session.name}</h4>
                    <span className={cn(
                      "px-2 py-0.5 md:px-3 md:py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest",
                      session.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                    )}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-on-surface-variant/70 truncate">
                    {session.subject} • {session.date}, {session.time}
                  </p>
                </div>
                <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                  {session.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onPageChange('chat')}
                        className="flex-1 sm:flex-none bg-primary/5 text-primary text-[10px] md:text-[11px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Message
                      </button>
                      <button 
                        onClick={() => onPageChange('live-class')}
                        className="flex-1 sm:flex-none bg-primary text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Clock className="w-4 h-4" /> Join Class
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => onPageChange('bookings')}
                    className="flex-1 sm:flex-none bg-slate-100 text-on-surface text-[10px] md:text-[11px] font-black uppercase tracking-widest px-6 md:px-8 py-2.5 md:py-3 rounded-2xl hover:bg-slate-200 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
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
    </div>
  );
}
