import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  CalendarDays, 
  Tag, 
  BookOpen, 
  Star, 
  ShieldCheck,
  GraduationCap,
  X
} from 'lucide-react';
import { PageId } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  isOpen?: boolean;
  onClose?: () => void;
  user: any;
}

const navItems: { id: PageId; name: string; icon: React.ElementType }[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', name: 'Chat', icon: MessageSquare },
  { id: 'availability', name: 'Availability', icon: CalendarDays },
  { id: 'pricing', name: 'Pricing', icon: Tag },
  { id: 'bookings', name: 'Bookings', icon: BookOpen },
  { id: 'reviews', name: 'Reviews', icon: Star },
  { id: 'kyc', name: 'KYC & Pay', icon: ShieldCheck },
];

export function Sidebar({ currentPage, onPageChange, isOpen, onClose, user }: SidebarProps) {
  const content = (
    <aside className={cn(
      "h-screen w-[240px] bg-background border-r border-slate-200 flex flex-col p-5 gap-3 shadow-2xl md:shadow-none",
      "fixed left-0 top-0 z-50"
    )}>
      <div className="mb-6 px-1 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { onPageChange('dashboard'); onClose?.(); }}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-primary/5 transition-transform group-hover:scale-105 active:scale-95 group-hover:shadow-primary/10 overflow-hidden">
            <img src="/logo.png" alt="Eduqra" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <span className="text-primary font-black text-xl group-hover:animate-pulse">E</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-primary leading-none tracking-tighter">Eduqra</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="status-label !text-[9px] text-secondary">Learning</span>
              <div className="w-1 h-1 bg-tertiary rounded-full"></div>
              <span className="status-label !text-[9px] text-tertiary">Atelier</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      
      <p className="px-1 label-caps -mt-5 mb-5 opacity-40 !text-[10px]">Academic Atelier</p>
      
      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => { onPageChange(item.id); onClose?.(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "text-primary font-black bg-primary/10 shadow-sm" 
                  : "text-slate-500 font-bold hover:text-primary hover:bg-slate-50/50"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1.5 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
              <span className="secondary-text !text-sm font-bold">{item.name}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="pt-4 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border border-primary/5">
            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">{user?.displayName || 'Tutor'}</p>
            <p className="text-[10px] font-medium text-on-surface-variant truncate opacity-60">{user?.email}</p>
          </div>
        </div>
        <p className="text-[10px] text-on-surface-variant font-black text-center opacity-30 uppercase tracking-[0.2em]">
          © 2026 Eduqra Learning
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {content}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] md:hidden"
            />
            <motion.div 
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
